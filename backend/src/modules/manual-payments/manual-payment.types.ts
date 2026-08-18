import { env } from "../../config/env.js";

/**
 * Único mecanismo de faturação da app (ver docs/interno/preco-e-nome.md e
 * configuracao-pagamentos.md): nenhum dos métodos tem um gateway de
 * pagamento automático ligado — o utilizador transfere por fora da app e
 * submete um comprovativo, alguém com a chave de administração confirma
 * antes de ativar o Premium. Deixámos de usar o Stripe (ver histórico do
 * repositório) para não depender de uma conta pessoal da fundadora num
 * país diferente do da empresa.
 */
export type Market = "PT" | "BR" | "MZ";
export type ManualPaymentMethod = "PAYPAL" | "BANK_TRANSFER" | "MPESA" | "EMOLA";
export type ManualCadence = "monthly" | "annual";

export const MARKETS: Market[] = ["PT", "BR", "MZ"];

export const MARKET_PRICES: Record<Market, Record<ManualCadence, string>> = {
  PT: { monthly: "€5,99", annual: "€49,99" },
  BR: { monthly: "R$19,90", annual: "R$159,90" },
  MZ: { monthly: "199 MT", annual: "1.590 MT" },
};

/**
 * M-Pesa e e-Mola são serviços de dinheiro móvel específicos de
 * Moçambique — não existem para clientes em Portugal/Brasil. PayPal e
 * transferência bancária (para a conta da empresa) funcionam em qualquer
 * mercado.
 */
export function paymentMethodsFor(market: Market): ManualPaymentMethod[] {
  return market === "MZ" ? ["PAYPAL", "BANK_TRANSFER", "MPESA", "EMOLA"] : ["PAYPAL", "BANK_TRANSFER"];
}

/**
 * Sem gateway automático, também não há aviso de renovação nem cobrança
 * automática vindos de fora — por isso a app faz a sua própria
 * verificação: quantos dias antes de `planRenewsAt` o cliente já vê um
 * aviso para renovar.
 */
export const RENEWAL_REMINDER_DAYS = 3;

export interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  nib: string;
  iban: string;
  swift: string;
}

export interface PaymentContacts {
  paypalEmail: string;
  mpesaNumber: string;
  emolaNumber: string;
  bank: BankDetails;
  pricesByMarket: Record<Market, Record<ManualCadence, string>>;
  methodsByMarket: Record<Market, ManualPaymentMethod[]>;
}

export function paymentContacts(): PaymentContacts {
  return {
    paypalEmail: env.paypalReceiveEmail,
    mpesaNumber: env.mpesaReceiveNumber,
    emolaNumber: env.emolaReceiveNumber,
    bank: {
      bankName: env.bankName,
      accountHolder: env.bankAccountHolder,
      accountNumber: env.bankAccountNumber,
      nib: env.bankNib,
      iban: env.bankIban,
      swift: env.bankSwift,
    },
    pricesByMarket: MARKET_PRICES,
    methodsByMarket: Object.fromEntries(MARKETS.map((m) => [m, paymentMethodsFor(m)])) as Record<
      Market,
      ManualPaymentMethod[]
    >,
  };
}
