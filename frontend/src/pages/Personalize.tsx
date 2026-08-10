import { useState } from "react";
import { api, ApiError, type TemplateSection } from "../api/client.js";

interface Props {
  templateVersionId: string;
  templateTitle: string;
  paceOptions: string[];
  defaultSituationNote?: string;
  onCreated: (result: {
    sessionId: string;
    rendered: {
      opening: string;
      sections: TemplateSection[];
      emphasizedAnchorPhrases: string[];
      closing: string;
      pace: string;
    };
  }) => void;
}

/**
 * Únicos campos personalizáveis (secção 1): nome, situação, ritmo. O
 * backend rejeita qualquer ritmo fora de `paceOptions` — este formulário só
 * oferece essas opções, nunca texto livre para o ritmo.
 */
export function Personalize({ templateVersionId, templateTitle, paceOptions, defaultSituationNote, onCreated }: Props) {
  const [name, setName] = useState("");
  const [situationNote, setSituationNote] = useState(defaultSituationNote ?? "");
  const [pace, setPace] = useState(paceOptions[0] ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.createSession({
        templateVersionId,
        personalization: { name, situationNote: situationNote || undefined, pace },
      });
      onCreated(result);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível preparar a sessão.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen">
      <h1>Sessão: {templateTitle}</h1>
      <p className="explainer">
        Vamos personalizar esta sessão dentro dos limites aprovados pela
        fundadora — o seu nome, a sua situação e o ritmo. A estrutura
        terapêutica em si é sempre a mesma versão aprovada.
      </p>
      <form onSubmit={handleSubmit}>
        <label>
          Como se chama?
          <input required value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          Situação a ter em conta (opcional)
          <input value={situationNote} onChange={(e) => setSituationNote(e.target.value)} />
        </label>
        <label>
          Ritmo
          <select value={pace} onChange={(e) => setPace(e.target.value)}>
            {paceOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "A preparar…" : "Começar sessão"}
        </button>
      </form>
    </div>
  );
}
