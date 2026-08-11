import { prisma } from "../../lib/prisma.js";
import { encryptField, decryptField } from "../../lib/encryption.js";
import type { CrisisLevel } from "../crisis/crisis.types.js";
import type { ClinicalGoal } from "../templates/template.types.js";
import type { CheckInSubmission } from "./checkin.types.js";

export async function createCheckIn(params: {
  submission: CheckInSubmission;
  crisisSignalLevel: CrisisLevel;
}): Promise<{ id: string }> {
  const answersPlaintext = JSON.stringify({
    recentFeelingText: params.submission.recentFeelingText,
    situationNote: params.submission.situationNote ?? null,
    energyLevel: params.submission.energyLevel,
    additionalNote: params.submission.additionalNote ?? null,
    contraindicationSelfReport: params.submission.contraindicationSelfReport ?? null,
  });

  const created = await prisma.checkIn.create({
    data: {
      userId: params.submission.userId,
      answersEncrypted: encryptField(answersPlaintext),
      requestedGoal: params.submission.requestedGoal,
      crisisSignalLevel: params.crisisSignalLevel,
    },
  });

  return { id: created.id };
}

export async function getCheckIn(id: string) {
  const checkIn = await prisma.checkIn.findUniqueOrThrow({ where: { id } });
  const answers = JSON.parse(decryptField(checkIn.answersEncrypted)) as {
    recentFeelingText: string;
    situationNote: string | null;
    energyLevel: number;
    additionalNote: string | null;
    contraindicationSelfReport: boolean | null;
  };
  return {
    id: checkIn.id,
    userId: checkIn.userId,
    requestedGoal: checkIn.requestedGoal as ClinicalGoal | null,
    crisisSignalLevel: checkIn.crisisSignalLevel as CrisisLevel,
    matchedTemplateVersionId: checkIn.matchedTemplateVersionId,
    refusedNoTemplateAvailable: checkIn.refusedNoTemplateAvailable,
    answers,
  };
}

/**
 * Atualiza o nível de crise depois de o utilizador responder à pergunta
 * de esclarecimento (DIRECT_MENTION/SELF_HARM → CLEAR ou AMBIGUOUS). O
 * valor anterior não é mantido em histórico — o nível guardado reflete
 * sempre a avaliação final do check-in.
 */
export async function updateCrisisLevel(checkInId: string, level: CrisisLevel): Promise<void> {
  await prisma.checkIn.update({
    where: { id: checkInId },
    data: { crisisSignalLevel: level },
  });
}

export async function recordMatch(params: {
  checkInId: string;
  templateVersionId: string | null;
  refusedNoTemplateAvailable: boolean;
}): Promise<void> {
  await prisma.checkIn.update({
    where: { id: params.checkInId },
    data: {
      matchedTemplateVersionId: params.templateVersionId,
      refusedNoTemplateAvailable: params.refusedNoTemplateAvailable,
    },
  });
}
