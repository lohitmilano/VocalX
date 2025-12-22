import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { generateAffiliateSlug, generateReferralLink } from '@/lib/utils';
import { env } from '@/lib/env';

const createAffiliateSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(1, 'Name is required'),
  website: z.string().url('Invalid website URL').optional(),
  affiliateTier: z.enum(['silver', 'gold', 'platinum']).default('silver'),
  commissionRate: z.number().min(0).max(100).default(15),
});

const querySchema = z.object({
  page: z.string().transform(Number).default('1'),
  limit: z.string().transform(Number).default('20'),
  status: z.enum(['pending', 'active', 'inactive', 'suspended']).optional(),
  tier: z.enum(['silver', 'gold', 'platinum']).optional(),
  search: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const { searchParams } = new URL(req.url);
    const { page, limit, status, tier, search } = querySchema.parse(
      Object.fromEntries(searchParams.entries())
    );

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (status) where.status = status;
    if (tier) where.affiliateTier = tier;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [affiliates, total] = await Promise.all([
      db.affiliate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              customers: true,
              commissionEvents: true,
            },
          },
        },
      }),
      db.affiliate.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        affiliates,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error('Get affiliates error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req.headers.get('authorization'));

    const body = await req.json();
    const data = createAffiliateSchema.parse(body);

    // Check if email already exists
    const existingAffiliate = await db.affiliate.findUnique({
      where: { email: data.email },
    });

    if (existingAffiliate) {
      return NextResponse.json(
        { error: 'An affiliate with this email already exists' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let uniqueSlug: string;
    let isUnique = false;
    let attempts = 0;

    do {
      uniqueSlug = generateAffiliateSlug();
      const existing = await db.affiliate.findUnique({
        where: { uniqueSlug },
      });
      isUnique = !existing;
      attempts++;
    } while (!isUnique && attempts < 10);

    if (!isUnique) {
      return NextResponse.json(
        { error: 'Failed to generate unique affiliate code' },
        { status: 500 }
      );
    }

    const referralLink = generateReferralLink(uniqueSlug, env.MAIN_APP_URL);

    const affiliate = await db.affiliate.create({
      data: {
        ...data,
        uniqueSlug,
        referralLink,
        status: 'active',
      },
    });

    return NextResponse.json({
      success: true,
      data: affiliate,
    });
  } catch (error) {
    console.error('Create affiliate error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create affiliate' },
      { status: 500 }
    );
  }
}
