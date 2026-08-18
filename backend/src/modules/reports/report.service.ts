import { prisma } from "../../lib/prisma.js";
import { decryptField } from "../../lib/encryption.js";
import type { ClinicalGoal } from "../templates/template.types.js";

export class ReportRequiresPremiumError extends Error {}

export interface ProgressReportEntry {
  date: string;
  goal: ClinicalGoal | null;
  energyLevel: number | null;
}

export interface ProgressReport {
  totalCheckIns: number;
  totalSessionsCompleted: number;
  favoriteGoal: ClinicalGoal | null;
  averageEnergyLevel: number | null;
  recentActivity: ProgressReportEntry[];
}

const RECENT_ACTIVITY_LIMIT = 10;

/**
 * Relatórios de evolução (Premium, ver docs/interno/preco-e-nome.md) —
 * agrega dados já guardados (check-ins, sessões concluídas). Nunca cria
 * dados novos nem precisa de nenhuma infraestrutura extra. Grátis não tem
 * acesso — pedir o relatório devolve ReportRequiresPremiumError (402),
 * igual ao limite diário de sessões.
 */
export class ReportService {
  async getProgressReport(userId: string): Promise<ProgressReport> {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { plan: true } });
    if (user.plan !== "PREMIUM") {
      throw new ReportRequiresPremiumError("Os relatórios de evolução são exclusivos do plano Premium.");
    }

    const checkIns = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    const totalSessionsCompleted = await prisma.therapySession.count({
      where: { userId, status: "COMPLETED" },
    });

    const goalCounts = new Map<string, number>();
    const energyLevels: number[] = [];
    const recentActivity: ProgressReportEntry[] = [];

    for (const checkIn of checkIns) {
      if (checkIn.requestedGoal) {
        goalCounts.set(checkIn.requestedGoal, (goalCounts.get(checkIn.requestedGoal) ?? 0) + 1);
      }

      let energyLevel: number | null = null;
      const answers = JSON.parse(decryptField(checkIn.answersEncrypted)) as { energyLevel?: number };
      if (typeof answers.energyLevel === "number") energyLevel = answers.energyLevel;
      if (energyLevel !== null) energyLevels.push(energyLevel);

      if (recentActivity.length < RECENT_ACTIVITY_LIMIT) {
        recentActivity.push({
          date: checkIn.createdAt.toISOString(),
          goal: checkIn.requestedGoal as ClinicalGoal | null,
          energyLevel,
        });
      }
    }

    let favoriteGoal: ClinicalGoal | null = null;
    let favoriteCount = 0;
    for (const [goal, count] of goalCounts) {
      if (count > favoriteCount) {
        favoriteGoal = goal as ClinicalGoal;
        favoriteCount = count;
      }
    }

    const averageEnergyLevel =
      energyLevels.length > 0
        ? Math.round((energyLevels.reduce((a, b) => a + b, 0) / energyLevels.length) * 10) / 10
        : null;

    return {
      totalCheckIns: checkIns.length,
      totalSessionsCompleted,
      favoriteGoal,
      averageEnergyLevel,
      recentActivity,
    };
  }
}
