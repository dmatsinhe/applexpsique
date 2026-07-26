import { useEffect, useState } from "react";
import { api } from "../api/client.js";

interface Props {
  onDecided: () => void;
}

/**
 * Secção 5: as duas opções têm de ter peso visual igual e NENHUMA vem
 * pré-selecionada — o utilizador tem de clicar ativamente numa delas para
 * avançar. Por isso: nenhum `useState<boolean>` com valor inicial `true`
 * ou `false` a representar a escolha — usamos `null` até haver clique, e o
 * botão "avançar" só existe implicitamente através da própria escolha (cada
 * opção já confirma e avança).
 */
export function CrisisConsent({ onDecided }: Props) {
  const [explanation, setExplanation] = useState<{
    title: string;
    body: string;
    options: { value: boolean; label: string }[];
  } | null>(null);
  const [submitting, setSubmitting] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getCrisisConsentExplanation().then(setExplanation).catch(() => setError("Não foi possível carregar esta informação."));
  }, []);

  async function choose(value: boolean) {
    setSubmitting(value);
    setError(null);
    try {
      await api.setCrisisConsent(value);
      onDecided();
    } catch {
      setError("Não foi possível guardar a sua escolha. Tente novamente.");
      setSubmitting(null);
    }
  }

  if (!explanation) return <div className="screen">A carregar…</div>;

  return (
    <div className="screen">
      <h1>{explanation.title}</h1>
      <p className="explainer">{explanation.body}</p>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="equal-weight-choice">
        {explanation.options.map((option) => (
          <button
            key={String(option.value)}
            type="button"
            className="choice-button"
            disabled={submitting !== null}
            onClick={() => choose(option.value)}
          >
            {submitting === option.value ? "A guardar…" : option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
