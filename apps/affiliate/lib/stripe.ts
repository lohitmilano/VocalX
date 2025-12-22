import Stripe from 'stripe';
import { env } from './env';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

export interface StripeWebhookEvent {
  id: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

export class StripeService {
  static verifyWebhookSignature(payload: string, signature: string): StripeWebhookEvent {
    try {
      return stripe.webhooks.constructEvent(
        payload,
        signature,
        env.STRIPE_WEBHOOK_SECRET
      ) as StripeWebhookEvent;
    } catch (error) {
      throw new Error(`Webhook signature verification failed: ${error}`);
    }
  }

  static async getCustomer(customerId: string) {
    try {
      return await stripe.customers.retrieve(customerId);
    } catch (error) {
      throw new Error(`Failed to retrieve customer: ${error}`);
    }
  }

  static async getCharge(chargeId: string) {
    try {
      return await stripe.charges.retrieve(chargeId);
    } catch (error) {
      throw new Error(`Failed to retrieve charge: ${error}`);
    }
  }

  static async getInvoice(invoiceId: string) {
    try {
      return await stripe.invoices.retrieve(invoiceId);
    } catch (error) {
      throw new Error(`Failed to retrieve invoice: ${error}`);
    }
  }
}
