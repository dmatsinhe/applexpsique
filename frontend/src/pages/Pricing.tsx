interface Props {
  onBack: () => void;
}

interface MarketPrice {
  market: string;
  monthly: string;
  annual: string;
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
 * Página informativa de preços — secção de negócio, sem qualquer sistema
 * de subscrição ou pagamento por trás (ver docs/interno/preco-e-nome.md).
 * Por isso não há botão "Subscrever": mostrar um botão que não faz nada
 * seria enganoso.
 */
export function Pricing({ onBack }: Props) {
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
        Esta página mostra os planos e valores previstos. Ainda não existe um sistema de
        subscrição ou pagamento ativo na app — por isso não há aqui nenhum botão de compra.
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
