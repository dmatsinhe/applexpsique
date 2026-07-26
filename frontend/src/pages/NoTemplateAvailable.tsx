import type { ClinicalGoal } from "../api/client.js";

const GOAL_LABELS: Record<ClinicalGoal, string> = {
  SLEEP: "Sono",
  GENERALIZED_ANXIETY: "Ansiedade generalizada",
  FOCUS: "Foco",
  SELF_ESTEEM: "Autoestima",
  HABIT: "Hábito",
  PAIN: "Dor",
  GRIEF: "Luto",
};

interface Props {
  availableGoals: ClinicalGoal[];
  onRestart: () => void;
}

/**
 * Secção 1: "A app não inventa um na hora — recusa a sessão de forma
 * clara e sugere um dos objetivos disponíveis, ou encaminha para consulta."
 */
export function NoTemplateAvailable({ availableGoals, onRestart }: Props) {
  return (
    <div className="screen">
      <h1>Ainda não temos uma sessão para este objetivo</h1>
      <p className="explainer">
        Não construímos sessões automáticas para objetivos sem um template
        escrito e aprovado por uma profissional licenciada — preferimos
        recusar a mostrar-lhe algo genérico ou desadequado. Se sentir que
        precisa de apoio, considere marcar uma consulta com a fundadora.
      </p>
      {availableGoals.length > 0 ? (
        <>
          <p>Objetivos disponíveis neste momento:</p>
          <ul>
            {availableGoals.map((goal) => (
              <li key={goal}>{GOAL_LABELS[goal]}</li>
            ))}
          </ul>
        </>
      ) : (
        <p>Ainda não há nenhum template aprovado disponível.</p>
      )}
      <button type="button" onClick={onRestart}>
        Voltar ao check-in
      </button>
    </div>
  );
}
