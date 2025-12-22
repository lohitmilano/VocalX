import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { getCurrentMonthYear, formatMonthYear } from '@/lib/utils';

const exportSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, 'Invalid month format (YYYY-MM)'),
  status: z.enum(['pending', 'approved', 'paid', 'failed']).optional(),
  format: z.enum(['csv', 'json']).default('csv'),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const { searchParams } = new URL(req.url);
    const query = exportSchema.parse({
      monthYear: searchParams.get('monthYear') || getCurrentMonthYear(),
      status: searchParams.get('status') || undefined,
      format: searchParams.get('format') || 'csv',
    });

    const where: any = { payoutMonth: query.monthYear };
    if (query.status) where.status = query.status;

    const payouts = await db.payout.findMany({
      where,
      include: {
        affiliate: {
          select: {
            name: true,
            email: true,
            affiliateTier: true,
            uniqueSlug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (query.format === 'json') {
      return NextResponse.json({
        success: true,
        data: {
          payouts: payouts.map(payout => ({
            ...payout,
            totalCommission: Number(payout.totalCommission),
          })),
          monthYear: query.monthYear,
          exportedAt: new Date().toISOString(),
        },
      });
    }

    // Generate CSV
    const csvHeaders = [
      'Payout ID',
      'Affiliate Name',
      'Affiliate Email',
      'Affiliate Code',
      'Tier',
      'Commission Amount',
      'Status',
      'Created Date',
      'Approved Date',
      'Paid Date',
      'Transaction ID',
      'Notes',
    ];

    const csvRows = payouts.map(payout => [
      payout.id,
      payout.affiliate.name,
      payout.affiliate.email,
      payout.affiliate.uniqueSlug,
      payout.affiliate.affiliateTier,
      Number(payout.totalCommission).toFixed(2),
      payout.status,
      payout.createdAt.toISOString().split('T')[0],
      payout.approvedAt ? payout.approvedAt.toISOString().split('T')[0] : '',
      payout.paidAt ? payout.paidAt.toISOString().split('T')[0] : '',
      payout.transactionId || '',
      payout.notes || '',
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      ),
    ].join('\n');

    const filename = `payouts_${query.monthYear}_${query.status || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Export payouts error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export payouts' },
      { status: 500 }
    );
  }
}
