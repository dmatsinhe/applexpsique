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
};

export function requireEncryptionKey(): string {
  return required("ENCRYPTION_KEY_BASE64");
}
