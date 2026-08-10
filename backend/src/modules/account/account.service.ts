import { prisma } from "../../lib/prisma.js";
import { decryptField } from "../../lib/encryption.js";

/**
 * Autoatendimento de dados (secção 8): "utilizador pode exportar ou apagar
 * o histórico a qualquer momento" — sem fricção, sem precisar de pedir a
 * ninguém. Ver docs/database-schema.md para o porquê de cada tabela.
 */
export class AccountService {
  async exportData(userId: string) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const checkIns = await prisma.checkIn.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });
    const sessions = await prisma.therapySession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
    });

    return {
      exportedAt: new Date().toISOString(),
      account: {
        email: user.email,
        locale: user.locale,
        isAdultVerified: user.isAdultVerified,
        createdAt: user.createdAt,
      },
      checkIns: checkIns.map((c) => ({
        id: c.id,
        createdAt: c.createdAt,
        requestedGoal: c.requestedGoal,
        crisisSignalLevel: c.crisisSignalLevel,
        answers: JSON.parse(decryptField(c.answersEncrypted)),
      })),
      therapySessions: sessions.map((s) => ({
        id: s.id,
        startedAt: s.startedAt,
        completedAt: s.completedAt,
        status: s.status,
        personalization: s.personalization,
        rendered: JSON.parse(decryptField(s.renderedContentEncrypted)),
      })),
    };
  }

  /**
   * Apaga o histórico (check-ins e sessões) mas mantém a conta ativa — para
   * quem quer continuar a usar a app sem o registo anterior.
   */
  async deleteHistory(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.therapySession.deleteMany({ where: { userId } }),
      prisma.checkIn.deleteMany({ where: { userId } }),
    ]);
  }

  /**
   * Apaga a conta por completo. Os eventos de auditoria de crise
   * (`crisis_events`) não são apagados — são anonimizados (userId → null)
   * em vez de removidos, porque servem um propósito de segurança distinto
   * (revisão de falsos positivos/negativos do classificador) que a secção
   * 5 exige manter, mesmo quando o utilizador deixa de existir. Já não
   * continham texto em claro, só um hash — apagar o vínculo ao utilizador
   * é suficiente para o direito ao apagamento.
   */
  async deleteAccount(userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.therapySession.deleteMany({ where: { userId } }),
      prisma.checkIn.deleteMany({ where: { userId } }),
      prisma.crisisEvent.updateMany({ where: { userId }, data: { userId: null } }),
      prisma.voicePreference.deleteMany({ where: { userId } }),
      prisma.user.delete({ where: { id: userId } }),
    ]);
  }
}
