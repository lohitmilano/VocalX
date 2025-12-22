import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const updatePayoutSchema = z.object({
  status: z.enum(['pending', 'approved', 'paid', 'failed']),
  notes: z.string().optional(),
  transactionId: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const payout = await db.payout.findUnique({
      where: { id: params.id },
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
    });

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    // Get commission events for this payout
    const commissionEvents = await db.commissionEvent.findMany({
      where: {
        affiliateId: payout.affiliateId,
        monthYear: payout.payoutMonth,
        status: 'confirmed',
      },
      include: {
        customer: {
          select: {
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...payout,
        totalCommission: Number(payout.totalCommission),
        commissionEvents: commissionEvents.map(event => ({
          ...event,
          chargeAmount: Number(event.chargeAmount),
          commissionAmount: Number(event.commissionAmount),
          commissionRate: Number(event.commissionRate),
        })),
      },
    });
  } catch (error) {
    console.error('Get payout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch payout' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { admin } = await requireAuth(req.headers.get('authorization'));

    const body = await req.json();
    const data = updatePayoutSchema.parse(body);

    const payout = await db.payout.findUnique({
      where: { id: params.id },
    });

    if (!payout) {
      return NextResponse.json(
        { error: 'Payout not found' },
        { status: 404 }
      );
    }

    const updateData: any = { ...data };

    // Set approval/payment timestamps
    if (data.status === 'approved' && payout.status === 'pending') {
      updateData.approvedBy = admin.id;
      updateData.approvedAt = new Date();
    }

    if (data.status === 'paid' && payout.status !== 'paid') {
      updateData.paidAt = new Date();
    }

    const updatedPayout = await db.payout.update({
      where: { id: params.id },
      data: updateData,
      include: {
        affiliate: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updatedPayout,
        totalCommission: Number(updatedPayout.totalCommission),
      },
    });
  } catch (error) {
    console.error('Update payout error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update payout' },
      { status: 500 }
    );
  }
}
