import { NextRequest, NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { StripeService } from '@/lib/stripe';
import { CommissionService } from '@/lib/commission';
import { getCurrentMonthYear } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    // Verify webhook signature
    const event = StripeService.verifyWebhookSignature(body, signature);

    // Log webhook event
    await db.webhookLog.create({
      data: {
        eventType: event.type,
        stripeEventId: event.id,
        payload: event as any,
        processed: false,
      },
    });

    // Check if we've already processed this event
    const existingLog = await db.webhookLog.findFirst({
      where: {
        stripeEventId: event.id,
        processed: true,
      },
    });

    if (existingLog) {
      console.log(`Event ${event.id} already processed`);
      return NextResponse.json({ received: true });
    }

    // Process different event types
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event);
        break;
      
      case 'charge.refunded':
        await handleChargeRefunded(event);
        break;
      
      case 'customer.created':
        await handleCustomerCreated(event);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    // Mark event as processed
    await db.webhookLog.updateMany({
      where: { stripeEventId: event.id },
      data: { processed: true },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    
    // Log error
    try {
      const body = await req.text();
      await db.webhookLog.create({
        data: {
          eventType: 'error',
          stripeEventId: `error_${Date.now()}`,
          payload: { error: String(error), body } as any,
          processed: false,
          errorMessage: String(error),
        },
      });
    } catch (logError) {
      console.error('Failed to log webhook error:', logError);
    }

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

async function handleInvoicePaymentSucceeded(event: any) {
  const invoice = event.data.object;
  const customerId = invoice.customer;
  const chargeId = invoice.charge;
  const amountPaid = invoice.amount_paid / 100; // Convert from cents

  console.log(`Processing payment: ${chargeId} for customer: ${customerId}`);

  // Find customer and their affiliate
  const customer = await db.customer.findUnique({
    where: { stripeCustomerId: customerId },
    include: { affiliate: true },
  });

  if (!customer || !customer.affiliate) {
    console.log(`No affiliate found for customer: ${customerId}`);
    return;
  }

  if (customer.affiliate.status !== 'active') {
    console.log(`Affiliate ${customer.affiliate.id} is not active`);
    return;
  }

  const monthYear = getCurrentMonthYear();

  // Process commission
  await CommissionService.processCommissionEvent({
    affiliateId: customer.affiliate.id,
    customerId: customer.id,
    stripeChargeId: chargeId,
    stripeEventId: event.id,
    chargeAmount: amountPaid,
    eventType: 'charge.succeeded',
    monthYear,
  });

  console.log(`Commission processed for affiliate: ${customer.affiliate.id}`);
}

async function handleChargeRefunded(event: any) {
  const charge = event.data.object;
  const chargeId = charge.id;

  console.log(`Processing refund: ${chargeId}`);

  // Process refund
  await CommissionService.processRefund(chargeId, event.id);

  console.log(`Refund processed for charge: ${chargeId}`);
}

async function handleCustomerCreated(event: any) {
  const customer = event.data.object;
  const customerId = customer.id;
  const email = customer.email;

  console.log(`New customer created: ${customerId} (${email})`);

  // Check if customer already exists in our database
  const existingCustomer = await db.customer.findUnique({
    where: { stripeCustomerId: customerId },
  });

  if (existingCustomer) {
    console.log(`Customer ${customerId} already exists in database`);
    return;
  }

  // For now, we'll create the customer without affiliate attribution
  // Attribution will be handled by the main app when the customer signs up
  await db.customer.create({
    data: {
      email,
      stripeCustomerId: customerId,
    },
  });

  console.log(`Customer ${customerId} added to database`);
}
