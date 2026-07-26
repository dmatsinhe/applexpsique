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
