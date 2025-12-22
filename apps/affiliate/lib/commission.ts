import { db } from './db';
import { Decimal } from '@prisma/client/runtime/library';

export interface CommissionTier {
  name: string;
  minRevenue: number;
  maxRevenue: number | null;
  rate: number;
}

export const COMMISSION_TIERS: CommissionTier[] = [
  { name: 'silver', minRevenue: 0, maxRevenue: 999, rate: 15 },
  { name: 'gold', minRevenue: 1000, maxRevenue: 4999, rate: 20 },
  { name: 'platinum', minRevenue: 5000, maxRevenue: null, rate: 25 },
];

export class CommissionService {
  static calculateCommissionRate(monthlyRevenue: number): number {
    for (const tier of COMMISSION_TIERS.reverse()) {
      if (monthlyRevenue >= tier.minRevenue && 
          (tier.maxRevenue === null || monthlyRevenue <= tier.maxRevenue)) {
        return tier.rate;
      }
    }
    return COMMISSION_TIERS[0].rate; // Default to silver
  }

  static getTierName(monthlyRevenue: number): string {
    for (const tier of COMMISSION_TIERS.reverse()) {
      if (monthlyRevenue >= tier.minRevenue && 
          (tier.maxRevenue === null || monthlyRevenue <= tier.maxRevenue)) {
        return tier.name;
      }
    }
    return COMMISSION_TIERS[0].name; // Default to silver
  }

  static async updateAffiliateTier(affiliateId: string) {
    // Calculate last 30 days revenue for this affiliate
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const revenueSum = await db.commissionEvent.aggregate({
      where: {
        affiliateId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
        status: 'confirmed',
      },
      _sum: {
        chargeAmount: true,
      },
    });

    const monthlyRevenue = Number(revenueSum._sum.chargeAmount || 0);
    const newTier = this.getTierName(monthlyRevenue);
    const newRate = this.calculateCommissionRate(monthlyRevenue);

    // Update affiliate tier and commission rate
    await db.affiliate.update({
      where: { id: affiliateId },
      data: {
        affiliateTier: newTier,
        commissionRate: new Decimal(newRate),
      },
    });

    return { tier: newTier, rate: newRate, monthlyRevenue };
  }

  static async processCommissionEvent(data: {
    affiliateId: string;
    customerId: string;
    stripeChargeId: string;
    stripeEventId: string;
    chargeAmount: number;
    eventType: string;
    monthYear: string;
  }) {
    // Get current affiliate commission rate
    const affiliate = await db.affiliate.findUnique({
      where: { id: data.affiliateId },
      select: { commissionRate: true },
    });

    if (!affiliate) {
      throw new Error('Affiliate not found');
    }

    const commissionRate = Number(affiliate.commissionRate);
    const commissionAmount = (data.chargeAmount * commissionRate) / 100;

    // Create commission event
    const event = await db.commissionEvent.create({
      data: {
        affiliateId: data.affiliateId,
        customerId: data.customerId,
        stripeChargeId: data.stripeChargeId,
        stripeEventId: data.stripeEventId,
        chargeAmount: new Decimal(data.chargeAmount),
        commissionRate: new Decimal(commissionRate),
        commissionAmount: new Decimal(commissionAmount),
        eventType: data.eventType,
        monthYear: data.monthYear,
        status: 'confirmed',
      },
    });

    // Update affiliate totals
    await db.affiliate.update({
      where: { id: data.affiliateId },
      data: {
        totalRevenue: {
          increment: new Decimal(data.chargeAmount),
        },
        totalCommissions: {
          increment: new Decimal(commissionAmount),
        },
      },
    });

    // Update affiliate tier based on new revenue
    await this.updateAffiliateTier(data.affiliateId);

    return event;
  }

  static async processRefund(stripeChargeId: string, stripeEventId: string) {
    // Find the original commission event
    const originalEvent = await db.commissionEvent.findUnique({
      where: { stripeChargeId },
    });

    if (!originalEvent) {
      throw new Error('Original commission event not found');
    }

    // Create refund event (negative commission)
    const refundEvent = await db.commissionEvent.create({
      data: {
        affiliateId: originalEvent.affiliateId,
        customerId: originalEvent.customerId,
        stripeChargeId: `${stripeChargeId}_refund`,
        stripeEventId,
        chargeAmount: originalEvent.chargeAmount.mul(-1),
        commissionRate: originalEvent.commissionRate,
        commissionAmount: originalEvent.commissionAmount.mul(-1),
        eventType: 'charge.refunded',
        monthYear: originalEvent.monthYear,
        status: 'confirmed',
      },
    });

    // Update original event status
    await db.commissionEvent.update({
      where: { id: originalEvent.id },
      data: { status: 'refunded' },
    });

    // Update affiliate totals
    await db.affiliate.update({
      where: { id: originalEvent.affiliateId },
      data: {
        totalRevenue: {
          decrement: originalEvent.chargeAmount,
        },
        totalCommissions: {
          decrement: originalEvent.commissionAmount,
        },
      },
    });

    return refundEvent;
  }

  static async generateMonthlyPayouts(monthYear: string) {
    // Get all affiliates with commissions for the month
    const affiliateCommissions = await db.commissionEvent.groupBy({
      by: ['affiliateId'],
      where: {
        monthYear,
        status: 'confirmed',
      },
      _sum: {
        commissionAmount: true,
      },
      having: {
        commissionAmount: {
          _sum: {
            gt: 0,
          },
        },
      },
    });

    const payouts = [];

    for (const commission of affiliateCommissions) {
      const totalCommission = Number(commission._sum.commissionAmount || 0);
      
      if (totalCommission > 0) {
        // Check if payout already exists
        const existingPayout = await db.payout.findUnique({
          where: {
            affiliateId_payoutMonth: {
              affiliateId: commission.affiliateId,
              payoutMonth: monthYear,
            },
          },
        });

        if (!existingPayout) {
          const payout = await db.payout.create({
            data: {
              affiliateId: commission.affiliateId,
              payoutMonth: monthYear,
              totalCommission: new Decimal(totalCommission),
              status: 'pending',
            },
            include: {
              affiliate: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          });

          payouts.push(payout);
        }
      }
    }

    return payouts;
  }
}
