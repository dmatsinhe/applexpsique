import { useEffect, useState } from "react";
import { api, ApiError, type ClinicalGoal } from "../api/client.js";

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

interface Report {
  totalCheckIns: number;
  totalSessionsCompleted: number;
  favoriteGoal: ClinicalGoal | null;
  averageEnergyLevel: number | null;
  recentActivity: { date: string; goal: ClinicalGoal | null; energyLevel: number | null }[];
}

interface Props {
  onBack: () => void;
  onGoToPricing: () => void;
}

/**
 * Relatórios de evolução (Premium) — só agrega dados já guardados, nunca
 * inventa nada. Grátis vê um convite para o Premium em vez do relatório
 * (backend devolve 402, ver report.service.ts).
 */
export function ProgressReport({ onBack, onGoToPricing }: Props) {
  const [report, setReport] = useState<Report | null>(null);
  const [requiresPremium, setRequiresPremium] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getProgressReport()
      .then(setReport)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 402) {
          setRequiresPremium(true);
        } else {
          setError(err instanceof ApiError ? err.message : "Não foi possível carregar o relatório.");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="screen">
      <button type="button" className="secondary" onClick={onBack}>
        ← Voltar
      </button>

      <h1>A minha evolução</h1>

      {loading && <p className="explainer">A carregar…</p>}
      {error && <p className="error" role="alert">{error}</p>}

      {requiresPremium && (
        <>
          <p className="explainer">
            Os relatórios de evolução são exclusivos do plano Premium — mostram os seus
            check-ins, sessões concluídas e tendências ao longo do tempo.
          </p>
          <button type="button" onClick={onGoToPricing}>
            Ver planos Premium
          </button>
        </>
      )}

      {report && (
        <>
          <p className="explainer">
            {report.totalCheckIns} registo{report.totalCheckIns === 1 ? "" : "s"} de check-in ·{" "}
            {report.totalSessionsCompleted}{" "}
            {report.totalSessionsCompleted === 1 ? "sessão concluída" : "sessões concluídas"}
          </p>
          {report.favoriteGoal && (
            <p className="explainer">
              Objetivo mais trabalhado: <strong>{GOAL_LABELS[report.favoriteGoal]}</strong>
            </p>
          )}
          {report.averageEnergyLevel !== null && (
            <p className="explainer">
              Nível de energia médio nos check-ins: <strong>{report.averageEnergyLevel} / 5</strong>
            </p>
          )}

          <h2>Atividade recente</h2>
          {report.recentActivity.length === 0 ? (
            <p className="explainer">Ainda não há check-ins registados.</p>
          ) : (
            <ul>
              {report.recentActivity.map((entry, i) => (
                <li key={i}>
                  {new Date(entry.date).toLocaleDateString("pt-PT")}
                  {entry.goal && ` — ${GOAL_LABELS[entry.goal]}`}
                  {entry.energyLevel !== null && ` — energia ${entry.energyLevel}/5`}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
