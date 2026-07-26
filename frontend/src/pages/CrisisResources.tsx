import { useState } from "react";
import { api, type CrisisResource } from "../api/client.js";

interface Props {
  resources: CrisisResource[];
  /** Presente só em sinal AMBÍGUO — nunca em sinal CLARO. */
  acknowledgement?: string;
  /** Presente só em sinal AMBÍGUO — permite continuar após reconhecimento explícito. */
  checkInId?: string;
  onContinue?: (outcome: unknown) => void;
  onRestart: () => void;
}

/**
 * Secção 5: em nenhum nível a IA tenta "resolver" ou "acalmar" a situação —
 * este ecrã só mostra recursos e, quando aplicável, reconhece o sinal.
 * Nunca aconselha, nunca minimiza.
 */
export function CrisisResources({ resources, acknowledgement, checkInId, onContinue, onRestart }: Props) {
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
      <h2>Recursos de apoio</h2>
      <ul className="crisis-resources">
        {resources.map((resource) => (
          <li key={resource.name}>
            <strong>{resource.name}</strong>
            {resource.phone && <span> — {resource.phone}</span>}
            <p>{resource.description}</p>
            <p className="availability">{resource.availability}</p>
          </li>
        ))}
      </ul>

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
