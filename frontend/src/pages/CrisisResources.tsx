import { useState } from "react";
import { api, type CrisisResponseBundle } from "../api/client.js";

interface Props {
  response: CrisisResponseBundle;
  noRealTimeSupervisionNotice: string;
  /** Presente só em sinal AMBÍGUO — nunca em sinal CLARO. */
  acknowledgement?: string;
  /** Presente só em sinal AMBÍGUO — permite continuar após reconhecimento explícito. */
  checkInId?: string;
  onContinue?: (outcome: unknown) => void;
  onRestart: () => void;
}

/**
 * Secção 5 (revista): em nenhum nível a IA tenta "resolver" ou "acalmar" a
 * situação — este ecrã só mostra três blocos SEPARADOS e claramente
 * identificados, nunca fundidos numa única frase:
 *   1. Recursos de crise imediatos (Linha 1411, 112).
 *   2. Apoio profissional na área do utilizador (encaminhamento).
 *   3. Contacto privado da fundadora — explicitamente NÃO um canal de
 *      resposta a crise.
 * A app nunca promete supervisão humana em tempo real — isso é comunicado
 * de forma explícita e visível (`noRealTimeSupervisionNotice`), nunca
 * escondido atrás de um ecrã genérico.
 */
export function CrisisResources({
  response,
  noRealTimeSupervisionNotice,
  acknowledgement,
  checkInId,
  onContinue,
  onRestart,
}: Props) {
  const [continuing, setContinuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (!checkInId || !onContinue) return;
    setContinuing(true);
    setError(null);
    try {
      const outcome = await api.continueAfterAmbiguousCrisis(checkInId);
      onContinue(outcome);
    } catch {
      setError("Não foi possível continuar. Os recursos de apoio acima continuam disponíveis.");
      setContinuing(false);
    }
  }

  return (
    <div className="screen">
      {acknowledgement && <p className="acknowledgement">{acknowledgement}</p>}

      <p className="supervision-notice">{noRealTimeSupervisionNotice}</p>

      <section className="crisis-block">
        <h2>Recursos de crise imediatos</h2>
        <ul className="crisis-resources">
          {response.immediateResources.map((resource) => (
            <li key={resource.name}>
              <strong>{resource.name}</strong>
              {resource.phone && <span> — {resource.phone}</span>}
              <p>{resource.description}</p>
              <p className="availability">{resource.availability}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="crisis-block">
        <h2>Apoio profissional na sua área</h2>
        <ul className="crisis-resources">
          {response.regionalProfessionalSupport.map((option) => (
            <li key={option.name}>
              <strong>{option.name}</strong>
              {option.contact && <span> — {option.contact}</span>}
              <p>{option.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="crisis-block founder-contact-block">
        <h2>Contacto da fundadora</h2>
        <p className="disclaimer-label">{response.founderPrivateContact.disclaimerLabel}</p>
        <p>
          <strong>{response.founderPrivateContact.name}</strong>
          <br />
          {response.founderPrivateContact.credentials}
        </p>
        <p>{response.founderPrivateContact.bookingContact}</p>
      </section>

      {checkInId && onContinue && (
        <>
          <p className="explainer">
            A decisão de continuar é sua. Os recursos acima continuam disponíveis a qualquer momento.
          </p>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="button" onClick={handleContinue} disabled={continuing}>
            {continuing ? "A continuar…" : "Continuar mesmo assim"}
          </button>
        </>
      )}

      <button type="button" className="secondary" onClick={onRestart}>
        Voltar ao início
      </button>
    </div>
  );
}
