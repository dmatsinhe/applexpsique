import { prisma } from "../../lib/prisma.js";

export async function createAdultUser(params: {
  email: string;
  passwordHash: string;
  locale: string;
}): Promise<{ id: string }> {
  const created = await prisma.user.create({
    data: {
      email: params.email,
      passwordHash: params.passwordHash,
      locale: params.locale,
      isAdultVerified: true,
      ageVerifiedAt: new Date(),
    },
  });
  return { id: created.id };
}

export async function findUserByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findUserById(id: string) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

/**
 * Consentimento de notificação de crise (secção 5) — só grava um valor
 * quando o chamador fornece um booleano explícito; nunca é invocado com um
 * valor por defeito (ver AuthService.setCrisisConsent).
 */
export async function setCrisisConsent(params: {
  userId: string;
  notifyOnClearSignal: boolean;
  consentVersion: string;
}): Promise<void> {
  await prisma.user.update({
    where: { id: params.userId },
    data: {
      crisisNotifyOnClearSignal: params.notifyOnClearSignal,
      crisisConsentAt: new Date(),
      crisisConsentVersion: params.consentVersion,
    },
  });
}

/**
 * Hook para o caso "5.1: se a app suspeitar, por outros sinais, que um
 * utilizador é menor" — bloqueia acesso a conteúdo clínico revertendo a
 * verificação de idade. A deteção desses "outros sinais" é um processo
 * humano/de suporte fora do âmbito deste MVP; este método só implementa a
 * ação de bloqueio, não a deteção.
 */
export async function revokeAdultVerification(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { isAdultVerified: false },
  });
}
