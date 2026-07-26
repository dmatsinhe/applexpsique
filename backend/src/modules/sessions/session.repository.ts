import { prisma } from "../../lib/prisma.js";
import { decryptField, encryptField } from "../../lib/encryption.js";
import type { PersonalizationInput, RenderedSession } from "./personalization.types.js";

export async function createTherapySession(params: {
  userId: string;
  templateVersionId: string;
  personalization: PersonalizationInput;
  rendered: RenderedSession;
}): Promise<{ id: string }> {
  const created = await prisma.therapySession.create({
    data: {
      userId: params.userId,
      templateVersionId: params.templateVersionId,
      personalization: params.personalization as unknown as object,
      renderedContentEncrypted: encryptField(JSON.stringify(params.rendered)),
      status: "IN_PROGRESS",
    },
  });
  return { id: created.id };
}

export async function getTherapySession(id: string) {
  const session = await prisma.therapySession.findUniqueOrThrow({ where: { id } });
  return {
    id: session.id,
    userId: session.userId,
    templateVersionId: session.templateVersionId,
    status: session.status,
    resumePositionSeconds: session.resumePositionSeconds,
    rendered: JSON.parse(decryptField(session.renderedContentEncrypted)) as RenderedSession,
    startedAt: session.startedAt,
    completedAt: session.completedAt,
  };
}

/**
 * Robustez técnica (secção 9): guarda a posição de reprodução para permitir
 * retomar após perda de ligação, em vez de reiniciar do zero.
 */
export async function updateResumePosition(id: string, positionSeconds: number): Promise<void> {
  await prisma.therapySession.update({
    where: { id },
    data: { resumePositionSeconds: positionSeconds },
  });
}

export async function completeSession(id: string): Promise<void> {
  await prisma.therapySession.update({
    where: { id },
    data: { status: "COMPLETED", completedAt: new Date() },
  });
}

export async function abandonSession(id: string): Promise<void> {
  await prisma.therapySession.update({
    where: { id },
    data: { status: "ABANDONED" },
  });
}
