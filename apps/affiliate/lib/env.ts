import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  
  // Database
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  
  // Authentication
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().startsWith("sk_", "Invalid Stripe secret key"),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Invalid Stripe webhook secret"),
  STRIPE_PUBLISHABLE_KEY: z.string().startsWith("pk_", "Invalid Stripe publishable key"),
  
  // App URLs
  NEXTAUTH_URL: z.string().url().optional(),
  FRONTEND_URL: z.string().url().default("https://affiliate.getvocalx.app"),
  MAIN_APP_URL: z.string().url().default("https://getvocalx.app"),
  
  // Email (optional for notifications)
  SENDGRID_API_KEY: z.string().optional(),
  ADMIN_EMAIL: z.string().email().optional(),
  
  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).default("12"),
  
  // Rate limiting
  RATE_LIMIT_MAX: z.string().transform(Number).default("100"),
  RATE_LIMIT_WINDOW: z.string().transform(Number).default("900000"), // 15 minutes
});

export const env = EnvSchema.parse(process.env);

export type Env = z.infer<typeof EnvSchema>;
