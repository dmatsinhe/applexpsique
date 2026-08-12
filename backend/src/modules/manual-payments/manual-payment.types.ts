import { env } from "../../config/env.js";

/**
 * Moçambique só por agora (ver docs/interno/preco-e-nome.md e
 * configuracao-stripe.md): PayPal, M-Pesa e e-Mola não têm um gateway de
 * pagamento automático que se possa ligar como o Stripe, por isso o fluxo
 * é manual — o utilizador transfere e submete um comprovativo, alguém com
 * a chave de administração confirma antes de ativar o Premium.
 */
export type ManualPaymentMethod = "PAYPAL" | "MPESA" | "EMOLA";
export type ManualCadence = "monthly" | "annual";

export const MZ_PRICES: Record<ManualCadence, string> = {
  monthly: "199 MT",
  annual: "1.590 MT",
};

/**
 * Sem gateway automático, também não há aviso de renovação nem cobrança
 * automática vindos de fora (o Stripe faz isso sozinho para PT/BR) — por
 * isso a app faz a sua própria verificação: quantos dias antes de
 * `planRenewsAt` o cliente já vê um aviso para renovar.
 */
export const MZ_RENEWAL_REMINDER_DAYS = 3;

export interface PaymentContacts {
  paypalEmail: string;
  mpesaNumber: string;
  emolaNumber: string;
  prices: Record<ManualCadence, string>;
}

export function paymentContacts(): PaymentContacts {
  return {
    paypalEmail: env.paypalReceiveEmail,
    mpesaNumber: env.mpesaReceiveNumber,
    emolaNumber: env.emolaReceiveNumber,
    prices: MZ_PRICES,
  };
}
