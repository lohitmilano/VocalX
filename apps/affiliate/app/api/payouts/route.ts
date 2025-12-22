import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { CommissionService } from '@/lib/commission';
import { getCurrentMonthYear } from '@/lib/utils';

const generatePayoutsSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
});

const updatePayoutSchema = z.object({
  status: z.enum(['pending', 'approved', 'paid', 'failed']),
  notes: z.string().optional(),
  transactionId: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const { searchParams } = new URL(req.url);
    const monthYear = searchParams.get('monthYear') || getCurrentMonthYear();
    const status = searchParams.get('status');

    const where: any = { payoutMonth: monthYear };
    if (status) where.status = status;

    const payouts = await db.payout.findMany({
      where,
      include: {
        affiliate: {
          select: {
            id: true,
            name: true,
            email: true,
            affiliateTier: true,
            bankDetails: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate totals
    const totals = await db.payout.aggregate({
      where,
      _sum: { totalCommission: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      data: {
        payouts: payouts.map(payout => ({
          ...payout,
          totalCommission: Number(payout.totalCommission),
        })),
        totals: {
          amount: Number(totals._sum.totalCommission || 0),
          count: totals._count,
        },
        monthYear,
      },
    });
  } catch (error) {
    console.error('Get payouts error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payouts' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { admin } = await requireAuth(req.headers.get('authorization'));

    const body = await req.json();
    const { monthYear } = generatePayoutsSchema.parse(body);

    // Generate payouts for the specified month
    const payouts = await CommissionService.generateMonthlyPayouts(monthYear);

    return NextResponse.json({
      success: true,
      data: {
        payouts: payouts.map(payout => ({
          ...payout,
          totalCommission: Number(payout.totalCommission),
        })),
        count: payouts.length,
        monthYear,
      },
      message: `Generated ${payouts.length} payouts for ${monthYear}`,
    });
  } catch (error) {
    console.error('Generate payouts error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate payouts' },
      { status: 500 }
    );
  }
}
