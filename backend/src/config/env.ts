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

  // Pagamentos manuais — único mecanismo de faturação (Portugal, Brasil e
  // Moçambique). Sem gateway automático: ver manual-payment.service.ts.
  // Valores por omissão são os fornecidos pela fundadora; sobrepor via env
  // se mudarem.
  paypalReceiveEmail: process.env.PAYPAL_RECEIVE_EMAIL ?? "lexpsiqueism@gmail.com",
  mpesaReceiveNumber: process.env.MPESA_RECEIVE_NUMBER ?? "845946215",
  emolaReceiveNumber: process.env.EMOLA_RECEIVE_NUMBER ?? "871619151",
  bankName: process.env.BANK_NAME ?? "Nedbank",
  bankAccountHolder: process.env.BANK_ACCOUNT_HOLDER ?? "Lexpsique, Lda.",
  bankAccountNumber: process.env.BANK_ACCOUNT_NUMBER ?? "00012648108",
  bankNib: process.env.BANK_NIB ?? "0043 0000 0001 2648 1085 5",
  bankIban: process.env.BANK_IBAN ?? "MZ59004300000001264810855",
  bankSwift: process.env.BANK_SWIFT ?? "UNICMZMX",
};

export function requireEncryptionKey(): string {
  return required("ENCRYPTION_KEY_BASE64");
}
