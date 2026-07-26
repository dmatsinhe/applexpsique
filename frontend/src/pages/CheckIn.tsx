import { useState } from "react";
import { api, ApiError, type CheckInOutcome, type ClinicalGoal } from "../api/client.js";

interface Props {
  onOutcome: (outcome: CheckInOutcome) => void;
}

const GOAL_LABELS: Record<ClinicalGoal, string> = {
  SLEEP: "Sono",
  GENERALIZED_ANXIETY: "Ansiedade generalizada",
  FOCUS: "Foco",
  SELF_ESTEEM: "Autoestima",
  HABIT: "Hábito",
  PAIN: "Dor",
  GRIEF: "Luto",
};

/**
 * Check-in de 3–5 perguntas (secção 1): determina qual template é usado,
 * nunca que conteúdo clínico é gerado. As respostas de texto livre são
 * sempre avaliadas pelo classificador de crise no backend antes de
 * qualquer seleção de template.
 */
export function CheckIn({ onOutcome }: Props) {
  const [requestedGoal, setRequestedGoal] = useState<ClinicalGoal>("SLEEP");
  const [recentFeelingText, setRecentFeelingText] = useState("");
  const [situationNote, setSituationNote] = useState("");
  const [energyLevel, setEnergyLevel] = useState<1 | 2 | 3 | 4 | 5>(3);
  const [additionalNote, setAdditionalNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const outcome = await api.submitCheckIn({
        requestedGoal,
        recentFeelingText,
        situationNote: situationNote || undefined,
        energyLevel,
        additionalNote: additionalNote || undefined,
      });
      onOutcome(outcome);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível enviar o check-in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen">
      <h1>Como está hoje?</h1>
      <form onSubmit={handleSubmit}>
        <label>
          O que gostaria de trabalhar hoje?
          <select value={requestedGoal} onChange={(e) => setRequestedGoal(e.target.value as ClinicalGoal)}>
            {Object.entries(GOAL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Como se tem sentido nos últimos dias?
          <textarea
            required
            value={recentFeelingText}
            onChange={(e) => setRecentFeelingText(e.target.value)}
            rows={3}
          />
        </label>
        <label>
          Há alguma situação específica que gostaria que a sessão tivesse em conta? (opcional)
          <textarea value={situationNote} onChange={(e) => setSituationNote(e.target.value)} rows={2} />
        </label>
        <label>
          Nível de energia agora
          <input
            type="range"
            min={1}
            max={5}
            value={energyLevel}
            onChange={(e) => setEnergyLevel(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
          />
          <span>{energyLevel} / 5</span>
        </label>
        <label>
          Algo mais que queira partilhar antes de começarmos? (opcional)
          <textarea value={additionalNote} onChange={(e) => setAdditionalNote(e.target.value)} rows={2} />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? "A enviar…" : "Continuar"}
        </button>
      </form>
    </div>
  );
}
