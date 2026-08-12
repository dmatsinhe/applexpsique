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
