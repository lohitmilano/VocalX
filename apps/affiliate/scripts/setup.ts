#!/usr/bin/env tsx

/**
 * Setup script for VocalX Affiliate Program
 * Creates initial admin user and sets up database
 */

import { PrismaClient } from '@prisma/client';
import { AuthService } from '../lib/auth';
import { generateAffiliateSlug, generateReferralLink } from '../lib/utils';

const db = new PrismaClient();

async function createInitialAdmin() {
  console.log('🔧 Setting up VocalX Affiliate Program...\n');

  // Check if admin already exists
  const existingAdmin = await db.admin.findFirst();
  if (existingAdmin) {
    console.log('✅ Admin user already exists');
    return;
  }

  // Create initial admin
  const adminData = {
    email: 'admin@getvocalx.app',
    name: 'VocalX Admin',
    password: 'admin123', // Change this in production!
    role: 'admin',
  };

  const admin = await AuthService.createAdmin(adminData);
  console.log('✅ Created initial admin user:');
  console.log(`   Email: ${admin.email}`);
  console.log(`   Password: ${adminData.password}`);
  console.log('   ⚠️  Please change the password after first login!\n');
}

async function createSampleData() {
  console.log('📊 Creating sample data...\n');

  // Create sample affiliates
  const sampleAffiliates = [
    {
      email: 'john@techblog.com',
      name: 'John Smith',
      website: 'https://techblog.com',
      affiliateTier: 'gold' as const,
      commissionRate: 20,
    },
    {
      email: 'sarah@youtube.com',
      name: 'Sarah Johnson',
      website: 'https://youtube.com/@sarahtech',
      affiliateTier: 'silver' as const,
      commissionRate: 15,
    },
    {
      email: 'mike@podcast.com',
      name: 'Mike Wilson',
      website: 'https://mikepodcast.com',
      affiliateTier: 'platinum' as const,
      commissionRate: 25,
    },
  ];

  for (const affiliateData of sampleAffiliates) {
    const existingAffiliate = await db.affiliate.findUnique({
      where: { email: affiliateData.email },
    });

    if (!existingAffiliate) {
      const uniqueSlug = generateAffiliateSlug();
      const referralLink = generateReferralLink(uniqueSlug, 'https://getvocalx.app');

      await db.affiliate.create({
        data: {
          ...affiliateData,
          uniqueSlug,
          referralLink,
          status: 'active',
        },
      });

      console.log(`✅ Created affiliate: ${affiliateData.name} (${affiliateData.email})`);
    }
  }

  console.log('\n🎉 Setup complete!\n');
  console.log('Next steps:');
  console.log('1. Start the development server: npm run dev');
  console.log('2. Visit http://localhost:3001/login');
  console.log('3. Login with admin@getvocalx.app / admin123');
  console.log('4. Change the admin password');
  console.log('5. Configure your Stripe webhook endpoint');
}

async function main() {
  try {
    await createInitialAdmin();
    await createSampleData();
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
