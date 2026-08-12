import { useState } from "react";
import { api, ApiError } from "../api/client.js";

interface Props {
  onBack: () => void;
  isAuthenticated: boolean;
}

interface MarketPrice {
  market: string;
  monthly: string;
  annual: string;
}

interface SubscribeCardProps {
  market: "PT" | "BR";
  label: string;
  monthlyPrice: string;
  annualPrice: string;
  isAuthenticated: boolean;
}

function SubscribeCard({ market, label, monthlyPrice, annualPrice, isAuthenticated }: SubscribeCardProps) {
  const [loadingCadence, setLoadingCadence] = useState<"monthly" | "annual" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(cadence: "monthly" | "annual") {
    setError(null);
    if (!isAuthenticated) {
      setError("Precisa de iniciar sessão antes de subscrever.");
      return;
    }
    setLoadingCadence(cadence);
    try {
      const { url } = await api.createCheckoutSession({ market, cadence });
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Não foi possível iniciar o pagamento. Tente novamente mais tarde.",
      );
      setLoadingCadence(null);
    }
  }

  return (
    <div className="subscribe-card">
      <h3>{label}</h3>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" onClick={() => handleSubscribe("monthly")} disabled={loadingCadence !== null}>
        {loadingCadence === "monthly" ? "A abrir pagamento…" : `Subscrever — ${monthlyPrice}/mês`}
      </button>
      <button
        type="button"
        className="secondary"
        onClick={() => handleSubscribe("annual")}
        disabled={loadingCadence !== null}
      >
        {loadingCadence === "annual" ? "A abrir pagamento…" : `Subscrever anual — ${annualPrice}/ano`}
      </button>
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
 * Pagamento real (Stripe) só está ligado para Portugal e Brasil, o
 * lançamento faseado escolhido pela fundadora; os restantes mercados
 * continuam só informativos, sem botão de compra, até serem ativados.
 */
export function Pricing({ onBack, isAuthenticated }: Props) {
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
        Pagamento disponível para Portugal e Brasil. Os restantes mercados mostram os valores
        previstos, ainda sem botão de compra.
      </p>

      <h2>Gratuito</h2>
      <ul>
        <li>Registo emocional diário</li>
        <li>Conteúdos introdutórios</li>
        <li>Um exercício de bem-estar por dia</li>
        <li>Acesso limitado às ferramentas</li>
      </ul>

      <h2>CuidaMente Premium</h2>
      <ul>
        <li>Todos os exercícios e programas</li>
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
        Cartão, PayPal ou Multibanco (Portugal). É redirecionado para uma página de pagamento
        segura do Stripe — a CuidaMente nunca vê nem guarda os dados do seu cartão.
      </p>
      <div className="subscribe-grid">
        <SubscribeCard
          market="PT"
          label="Portugal"
          monthlyPrice="€5,99"
          annualPrice="€49,99"
          isAuthenticated={isAuthenticated}
        />
        <SubscribeCard
          market="BR"
          label="Brasil"
          monthlyPrice="R$19,90"
          annualPrice="R$159,90"
          isAuthenticated={isAuthenticated}
        />
      </div>

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
