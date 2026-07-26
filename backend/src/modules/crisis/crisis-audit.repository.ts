import { prisma } from "../../lib/prisma.js";
import { hashForAudit } from "../../lib/hash.js";
import type { ClassificationResult } from "./crisis.types.js";

/**
 * Audit-only logging (secção 5): anonimizado, usado apenas para revisão
 * periódica de falsos positivos/negativos — nunca lido por fluxos de
 * produto. Nunca grava o texto em claro, só um hash.
 */
export async function recordCrisisEvent(params: {
  userId?: string;
  source: "checkin" | "free_message";
  rawText: string;
  result: ClassificationResult;
}): Promise<void> {
  await prisma.crisisEvent.create({
    data: {
      userId: params.userId,
      source: params.source,
      signalLevel: params.result.level,
      classifierVersion: params.result.classifierVersion,
      inputHash: hashForAudit(params.rawText),
    },
  });
}
