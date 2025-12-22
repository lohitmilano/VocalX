import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

const updateAffiliateSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  website: z.string().url('Invalid website URL').optional(),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  affiliateTier: z.enum(['silver', 'gold', 'platinum']).optional(),
  commissionRate: z.number().min(0).max(100).optional(),
  bankDetails: z.object({
    accountName: z.string(),
    accountNumber: z.string(),
    routingNumber: z.string(),
    bankName: z.string(),
  }).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const affiliate = await db.affiliate.findUnique({
      where: { id: params.id },
      include: {
        customers: {
          select: {
            id: true,
            email: true,
            createdAt: true,
            attributedAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        commissionEvents: {
          select: {
            id: true,
            chargeAmount: true,
            commissionAmount: true,
            eventType: true,
            status: true,
            monthYear: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        payouts: {
          select: {
            id: true,
            payoutMonth: true,
            totalCommission: true,
            status: true,
            paidAt: true,
          },
          orderBy: { payoutMonth: 'desc' },
        },
        _count: {
          select: {
            customers: true,
            commissionEvents: true,
          },
        },
      },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: affiliate,
    });
  } catch (error) {
    console.error('Get affiliate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch affiliate' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const body = await req.json();
    const data = updateAffiliateSchema.parse(body);

    const affiliate = await db.affiliate.findUnique({
      where: { id: params.id },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    const updatedAffiliate = await db.affiliate.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({
      success: true,
      data: updatedAffiliate,
    });
  } catch (error) {
    console.error('Update affiliate error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update affiliate' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const affiliate = await db.affiliate.findUnique({
      where: { id: params.id },
    });

    if (!affiliate) {
      return NextResponse.json(
        { error: 'Affiliate not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting status to inactive
    await db.affiliate.update({
      where: { id: params.id },
      data: { status: 'inactive' },
    });

    return NextResponse.json({
      success: true,
      message: 'Affiliate deactivated successfully',
    });
  } catch (error) {
    console.error('Delete affiliate error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete affiliate' },
      { status: 500 }
    );
  }
}
