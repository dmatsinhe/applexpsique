import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "",
  encryptionKeyBase64: process.env.ENCRYPTION_KEY_BASE64 ?? "",
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  adminApiKey: process.env.ADMIN_API_KEY ?? "",
  corsOrigins: (process.env.CORS_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  isProduction: process.env.NODE_ENV === "production",

  // Faturação (Stripe) — ver billing.service.ts. Todos opcionais: sem
  // STRIPE_SECRET_KEY a app funciona normalmente, só a faturação fica
  // indisponível (503), o que é o estado esperado antes de a fundadora
  // configurar a conta Stripe.
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePricePtMonthly: process.env.STRIPE_PRICE_PT_MONTHLY ?? "",
  stripePricePtAnnual: process.env.STRIPE_PRICE_PT_ANNUAL ?? "",
  stripePriceBrMonthly: process.env.STRIPE_PRICE_BR_MONTHLY ?? "",
  stripePriceBrAnnual: process.env.STRIPE_PRICE_BR_ANNUAL ?? "",
};

export function requireEncryptionKey(): string {
  return required("ENCRYPTION_KEY_BASE64");
}
