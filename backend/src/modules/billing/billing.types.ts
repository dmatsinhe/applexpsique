import { env } from "../../config/env.js";

/**
 * Lançamento faseado (decisão da fundadora, docs/interno/preco-e-nome.md):
 * só Portugal e Brasil por agora. Outros mercados continuam só informativos
 * na página de preços, sem botão de subscrição.
 */
export type BillingMarket = "PT" | "BR";
export type BillingCadence = "monthly" | "annual";

export function isBillingConfigured(): boolean {
  return Boolean(env.stripeSecretKey);
}

export function priceIdFor(market: BillingMarket, cadence: BillingCadence): string | undefined {
  const table: Record<BillingMarket, Record<BillingCadence, string>> = {
    PT: { monthly: env.stripePricePtMonthly, annual: env.stripePricePtAnnual },
    BR: { monthly: env.stripePriceBrMonthly, annual: env.stripePriceBrAnnual },
  };
  return table[market][cadence] || undefined;
}

/**
 * Multibanco só existe para pagamentos em EUR (mercado PT). Pix e Boleto
 * (Brasil) ficam de fora por agora — exigem uma conta Stripe domiciliada
 * no Brasil, que a Lexpsique, Lda. (sediada em Portugal) não tem; ver o
 * guia de configuração Stripe para o plano de expansão.
 */
export function paymentMethodTypesFor(market: BillingMarket): string[] {
  return market === "PT" ? ["card", "paypal", "multibanco"] : ["card", "paypal"];
}

export function checkoutLocaleFor(_market: BillingMarket): "pt" {
  return "pt";
}
