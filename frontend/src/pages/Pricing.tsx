import { useEffect, useState } from "react";
import { api, ApiError, type ManualPaymentMethod, type Market } from "../api/client.js";

interface Props {
  onBack: () => void;
  isAuthenticated: boolean;
}

interface MarketPrice {
  market: string;
  monthly: string;
  annual: string;
}

interface BankDetails {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  nib: string;
  iban: string;
  swift: string;
}

interface PaymentContacts {
  paypalEmail: string;
  mpesaNumber: string;
  emolaNumber: string;
  bank: BankDetails;
  pricesByMarket: Record<Market, { monthly: string; annual: string }>;
  methodsByMarket: Record<Market, ManualPaymentMethod[]>;
}

const MARKET_LABELS: Record<Market, string> = { PT: "Portugal", BR: "Brasil", MZ: "Moçambique" };

const METHOD_LABELS: Record<ManualPaymentMethod, string> = {
  PAYPAL: "PayPal",
  BANK_TRANSFER: "Transferência bancária",
  MPESA: "M-Pesa",
  EMOLA: "e-Mola",
};

function PaymentDestination({ method, contacts }: { method: ManualPaymentMethod; contacts: PaymentContacts }) {
  if (method === "PAYPAL") {
    return (
      <p className="explainer">
        PayPal: <strong>{contacts.paypalEmail}</strong>
      </p>
    );
  }
  if (method === "MPESA") {
    return (
      <p className="explainer">
        M-Pesa: <strong>{contacts.mpesaNumber}</strong>
      </p>
    );
  }
  if (method === "EMOLA") {
    return (
      <p className="explainer">
        e-Mola: <strong>{contacts.emolaNumber}</strong>
      </p>
    );
  }
  const b = contacts.bank;
  return (
    <div className="explainer">
      <p>Transferência bancária para:</p>
      <ul>
        <li>Banco: {b.bankName}</li>
        <li>Titular: {b.accountHolder}</li>
        <li>Número de conta: {b.accountNumber}</li>
        <li>NIB: {b.nib}</li>
        <li>IBAN: {b.iban}</li>
        <li>SWIFT/BIC: {b.swift}</li>
      </ul>
    </div>
  );
}

interface ManualPaymentSectionProps {
  market: Market;
  contacts: PaymentContacts;
  isAuthenticated: boolean;
}

/**
 * Único mecanismo de pagamento da app (ver docs/interno/preco-e-nome.md e
 * configuracao-pagamentos.md) — sem gateway automático em nenhum mercado.
 * A pessoa transfere por fora da app e submete uma referência aqui; a
 * fundadora confirma manualmente antes de ativar o Premium.
 */
function ManualPaymentSection({ market, contacts, isAuthenticated }: ManualPaymentSectionProps) {
  const availableMethods = contacts.methodsByMarket[market];
  const prices = contacts.pricesByMarket[market];
  const [method, setMethod] = useState<ManualPaymentMethod>(availableMethods[0]);
  const [cadence, setCadence] = useState<"monthly" | "annual">("monthly");
  const [reference, setReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!isAuthenticated) {
      setError("Precisa de iniciar sessão antes de enviar o pedido.");
      return;
    }
    setSubmitting(true);
    try {
      await api.submitManualPaymentRequest({ market, method, cadence, reference });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="subscribe-card">
        <h3>{MARKET_LABELS[market]}</h3>
        <p className="explainer">
          Pedido enviado — vamos confirmar o pagamento e ativar o Premium em breve.
        </p>
      </div>
    );
  }

  return (
    <div className="subscribe-card">
      <h3>{MARKET_LABELS[market]}</h3>
      <p className="explainer">
        {availableMethods.map((m) => METHOD_LABELS[m]).join(", ")}. Envie o valor e submeta a
        referência abaixo — confirmamos manualmente e ativamos o Premium.
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Método
          <select value={method} onChange={(e) => setMethod(e.target.value as ManualPaymentMethod)}>
            {availableMethods.map((m) => (
              <option key={m} value={m}>
                {METHOD_LABELS[m]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Plano
          <select value={cadence} onChange={(e) => setCadence(e.target.value as "monthly" | "annual")}>
            <option value="monthly">Mensal — {prices.monthly}</option>
            <option value="annual">Anual — {prices.annual}</option>
          </select>
        </label>
        <p className="explainer">
          Envie <strong>{prices[cadence]}</strong> via {METHOD_LABELS[method]}:
        </p>
        <PaymentDestination method={method} contacts={contacts} />
        <label>
          Referência ou comprovativo
          <input
            type="text"
            required
            minLength={3}
            placeholder="Código da transação"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "A enviar…" : "Enviei o pagamento"}
        </button>
      </form>
    </div>
  );
}

const MARKET_PRICES: MarketPrice[] = [
  { market: "Portugal", monthly: "€5,99", annual: "€49,99" },
  { market: "Brasil", monthly: "R$19,90", annual: "R$159,90" },
  { market: "Moçambique", monthly: "199 MT", annual: "1.590 MT" },
  { market: "Angola", monthly: "2.500 Kz", annual: "19.900 Kz" },
  { market: "Cabo Verde", monthly: "399 CVE", annual: "3.190 CVE" },
  { market: "Guiné-Bissau", monthly: "1.500 XOF", annual: "11.900 XOF" },
  { market: "São Tomé e Príncipe", monthly: "99 STN", annual: "790 STN" },
  { market: "Timor-Leste", monthly: "US$3,99", annual: "US$31,99" },
  { market: "Guiné Equatorial", monthly: "2.500 XAF", annual: "19.900 XAF" },
];

/**
 * Página de preços — secção de negócio (ver docs/interno/preco-e-nome.md).
 * Pagamento manual (sem gateway automático) para Portugal, Brasil e
 * Moçambique, o lançamento faseado escolhido pela fundadora; os restantes
 * mercados continuam só informativos, sem botão de compra, até serem
 * ativados.
 */
export function Pricing({ onBack, isAuthenticated }: Props) {
  const [contacts, setContacts] = useState<PaymentContacts | null>(null);
  const [contactsError, setContactsError] = useState(false);

  useEffect(() => {
    api
      .getPaymentContacts()
      .then(setContacts)
      .catch(() => setContactsError(true));
  }, []);

  return (
    <div className="screen">
      <button type="button" className="secondary" onClick={onBack}>
        ← Voltar
      </button>

      <h1>Planos e preços</h1>
      <p className="explainer">
        Grátis para começar. Premium a partir do equivalente a €2–€6 por mês, conforme o país. A
        CuidaMente é uma ferramenta complementar de bem-estar — nunca promete cura nem substitui
        acompanhamento profissional.
      </p>

      <p className="supervision-notice">
        Pagamento disponível para Portugal, Brasil e Moçambique. Os restantes mercados mostram os
        valores previstos, ainda sem botão de compra.
      </p>

      <h2>Gratuito</h2>
      <ul>
        <li>Registo emocional diário</li>
        <li>Todos os objetivos disponíveis (sono, ansiedade, foco, hábitos e mais)</li>
        <li>Uma sessão de hipnose por dia</li>
      </ul>

      <h2>CuidaMente Premium</h2>
      <ul>
        <li>Sessões de hipnose sem limite diário</li>
        <li>Diário emocional completo</li>
        <li>Áudios de relaxamento</li>
        <li>Relatórios de evolução</li>
        <li>Conteúdos personalizados</li>
      </ul>
      <p className="explainer">
        Consultas com psicólogos são sempre cobradas à parte — nunca incluídas na mensalidade.
      </p>

      <h2>Subscrever</h2>
      <p className="explainer">
        Portugal e Brasil: PayPal ou transferência bancária. Moçambique: PayPal, transferência
        bancária, M-Pesa ou e-Mola. Sem gateway automático — submete o comprovativo e confirmamos
        manualmente.
      </p>
      {contactsError && (
        <p className="error" role="alert">
          Não foi possível carregar os dados de pagamento. Tente novamente mais tarde.
        </p>
      )}
      {contacts ? (
        <div className="subscribe-grid">
          <ManualPaymentSection market="PT" contacts={contacts} isAuthenticated={isAuthenticated} />
          <ManualPaymentSection market="BR" contacts={contacts} isAuthenticated={isAuthenticated} />
          <ManualPaymentSection market="MZ" contacts={contacts} isAuthenticated={isAuthenticated} />
        </div>
      ) : (
        !contactsError && <p className="explainer">A carregar…</p>
      )}

      <h2>Preços por mercado</h2>
      <div className="markdown-content" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Mercado</th>
              <th>Mensal</th>
              <th>Anual</th>
            </tr>
          </thead>
          <tbody>
            {MARKET_PRICES.map((p) => (
              <tr key={p.market}>
                <td>{p.market}</td>
                <td>{p.monthly}</td>
                <td>{p.annual}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="availability">
        Valores propostos, sujeitos a validação com utilizadores e às taxas das lojas de
        aplicações.
      </p>

      <h2>Oferta de lançamento</h2>
      <ul>
        <li>7 dias grátis</li>
        <li>40% de desconto no primeiro ano</li>
        <li>Preço especial para os primeiros 500 membros</li>
        <li>Programa "indique uma pessoa e ganhe um mês"</li>
      </ul>

      <button type="button" className="secondary" onClick={onBack}>
        Voltar
      </button>
    </div>
  );
}
