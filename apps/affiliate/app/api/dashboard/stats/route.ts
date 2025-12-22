import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getCurrentMonthYear } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const currentMonth = getCurrentMonthYear();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get basic counts
    const [
      totalAffiliates,
      activeAffiliates,
      totalCustomers,
      totalCommissions,
      currentMonthCommissions,
      recentCommissions,
      topAffiliates,
      pendingPayouts,
    ] = await Promise.all([
      // Total affiliates
      db.affiliate.count(),
      
      // Active affiliates
      db.affiliate.count({
        where: { status: 'active' },
      }),
      
      // Total customers with affiliates
      db.customer.count({
        where: { affiliateId: { not: null } },
      }),
      
      // Total commissions (all time)
      db.commissionEvent.aggregate({
        where: { status: 'confirmed' },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      
      // Current month commissions
      db.commissionEvent.aggregate({
        where: {
          status: 'confirmed',
          monthYear: currentMonth,
        },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      
      // Recent commissions (last 30 days)
      db.commissionEvent.aggregate({
        where: {
          status: 'confirmed',
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { commissionAmount: true },
        _count: true,
      }),
      
      // Top 5 affiliates by total commissions
      db.affiliate.findMany({
        where: { status: 'active' },
        orderBy: { totalCommissions: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          email: true,
          totalCommissions: true,
          totalRevenue: true,
          affiliateTier: true,
          _count: {
            select: { customers: true },
          },
        },
      }),
      
      // Pending payouts
      db.payout.aggregate({
        where: { status: 'pending' },
        _sum: { totalCommission: true },
        _count: true,
      }),
    ]);

    // Calculate monthly commission trend (last 6 months)
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthData = await db.commissionEvent.aggregate({
        where: {
          status: 'confirmed',
          monthYear,
        },
        _sum: { commissionAmount: true },
        _count: true,
      });
      
      monthlyTrend.push({
        month: monthYear,
        monthName: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        commissions: Number(monthData._sum.commissionAmount || 0),
        count: monthData._count,
      });
    }

    // Affiliate tier distribution
    const tierDistribution = await db.affiliate.groupBy({
      by: ['affiliateTier'],
      where: { status: 'active' },
      _count: true,
    });

    const stats = {
      overview: {
        totalAffiliates,
        activeAffiliates,
        totalCustomers,
        totalCommissions: Number(totalCommissions._sum.commissionAmount || 0),
        totalCommissionEvents: totalCommissions._count,
        avgCommissionPerEvent: totalCommissions._count > 0 
          ? Number(totalCommissions._sum.commissionAmount || 0) / totalCommissions._count 
          : 0,
      },
      currentMonth: {
        commissions: Number(currentMonthCommissions._sum.commissionAmount || 0),
        events: currentMonthCommissions._count,
      },
      recent: {
        commissions: Number(recentCommissions._sum.commissionAmount || 0),
        events: recentCommissions._count,
      },
      pendingPayouts: {
        total: Number(pendingPayouts._sum.totalCommission || 0),
        count: pendingPayouts._count,
      },
      topAffiliates: topAffiliates.map(affiliate => ({
        ...affiliate,
        totalCommissions: Number(affiliate.totalCommissions),
        totalRevenue: Number(affiliate.totalRevenue),
      })),
      monthlyTrend,
      tierDistribution: tierDistribution.map(tier => ({
        tier: tier.affiliateTier,
        count: tier._count,
      })),
    };

    return NextResponse.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
