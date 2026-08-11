import { useState } from "react";
import { api, ApiError, type CheckInOutcome, type ClinicalGoal } from "../api/client.js";

/**
 * Objetivos cujo guião clínico real exige triagem prévia que a app não pode
 * fazer (sem profissional no circuito) — substituída por esta pergunta de
 * autorrelato direto, própria de cada objetivo. Tem de espelhar
 * CONTRAINDICATION_SCREENING no backend (checkin.types.ts).
 */
const HABIT_CONTRAINDICATION_QUESTION =
  "Este comportamento envolve consumo de álcool ou drogas, jogo, autolesão, uma perturbação " +
  "alimentar, ou compulsão sexual?";

const CONTRAINDICATION_SCREENING_QUESTIONS: Partial<Record<ClinicalGoal, string>> = {
  GENERALIZED_ANXIETY:
    "Alguma vez foi diagnosticado(a) com mania, psicose ou perturbação dissociativa, ou está " +
    "atualmente numa crise que exige apoio imediato?",
  SELF_ESTEEM:
    "Está atualmente a viver violência, uma perturbação alimentar, depressão grave, ou um trauma " +
    "não resolvido/descompensado?",
  GRIEF:
    "Sente-se atualmente incapaz de garantir a sua própria segurança, está a viver sintomas de " +
    "psicose, ou sente-se gravemente desorganizado(a) neste momento?",
  HABIT_PHONE_OVERUSE: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_PROCRASTINATION: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_NAIL_BITING: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_MINDLESS_SNACKING: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_NOTIFICATION_CHECKING: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_SEDENTARY_AVOIDANCE: HABIT_CONTRAINDICATION_QUESTION,
  HABIT_BEDTIME_PROCRASTINATION: HABIT_CONTRAINDICATION_QUESTION,
};

interface Props {
  onOutcome: (outcome: CheckInOutcome) => void;
}

const GOAL_LABELS: Record<ClinicalGoal, string> = {
  SLEEP: "Sono",
  GENERALIZED_ANXIETY: "Ansiedade generalizada",
  FOCUS: "Foco",
  SELF_ESTEEM: "Autoestima",
  HABIT_PHONE_OVERUSE: "Hábito — uso excessivo do telemóvel",
  HABIT_PROCRASTINATION: "Hábito — procrastinação",
  HABIT_NAIL_BITING: "Hábito — roer as unhas",
  HABIT_MINDLESS_SNACKING: "Hábito — consumo automático de alimentos",
  HABIT_NOTIFICATION_CHECKING: "Hábito — verificação compulsiva de notificações",
  HABIT_SEDENTARY_AVOIDANCE: "Hábito — evitar exercício físico",
  HABIT_BEDTIME_PROCRASTINATION: "Hábito — adiar a hora de deitar",
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
  const [contraindicationSelfReport, setContraindicationSelfReport] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const contraindicationQuestion = CONTRAINDICATION_SCREENING_QUESTIONS[requestedGoal];
  const needsContraindicationScreening = contraindicationQuestion !== undefined;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (needsContraindicationScreening && contraindicationSelfReport === null) {
      setError("Por favor responda à pergunta acima antes de continuar.");
      return;
    }

    setSubmitting(true);
    try {
      const outcome = await api.submitCheckIn({
        requestedGoal,
        recentFeelingText,
        situationNote: situationNote || undefined,
        energyLevel,
        additionalNote: additionalNote || undefined,
        contraindicationSelfReport: needsContraindicationScreening
          ? contraindicationSelfReport!
          : undefined,
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
        {needsContraindicationScreening && (
          <fieldset>
            <legend>{contraindicationQuestion}</legend>
            <label>
              <input
                type="radio"
                name="contraindication"
                checked={contraindicationSelfReport === false}
                onChange={() => setContraindicationSelfReport(false)}
              />
              Não
            </label>
            <label>
              <input
                type="radio"
                name="contraindication"
                checked={contraindicationSelfReport === true}
                onChange={() => setContraindicationSelfReport(true)}
              />
              Sim
            </label>
          </fieldset>
        )}
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
