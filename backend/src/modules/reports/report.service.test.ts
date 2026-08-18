import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { encryptField } from "../../lib/encryption.js";
import { ReportRequiresPremiumError, ReportService } from "./report.service.js";
import { TemplateService } from "../templates/template.service.js";
import type { TemplateContent } from "../templates/template.types.js";

const reportService = new ReportService();
const templateService = new TemplateService();
const slug = "teste-relatorio-integracao";

function testContent(): TemplateContent {
  return {
    personalizableOpening: "Olá {{nome}}, hoje vamos trabalhar {{situacao}}.",
    sections: [{ id: "inducao", title: "Indução", body: "Indução de teste." }],
    anchorPhrases: ["Âncora de teste."],
    closing: "Encerramento de teste.",
    paceOptions: ["lento"],
  };
}

let templateVersionId: string;
let createdUserIds: string[] = [];

beforeAll(async () => {
  const draft = await templateService.submitDraft({
    slug,
    clinicalGoal: "PAIN",
    title: "Dor (teste relatório)",
    content: testContent(),
  });
  await templateService.approve(draft.versionId, "fundadora-teste@lexpsique.pt");
  templateVersionId = draft.versionId;
});

async function createTestUser(email: string, plan: "FREE" | "PREMIUM") {
  const user = await prisma.user.create({
    data: { email, passwordHash: "not-a-real-hash", isAdultVerified: true, ageVerifiedAt: new Date(), plan },
  });
  createdUserIds.push(user.id);
  return user;
}

async function addCheckIn(userId: string, goal: string, energyLevel: number, createdAt?: Date) {
  const checkIn = await prisma.checkIn.create({
    data: {
      userId,
      answersEncrypted: encryptField(JSON.stringify({ recentFeelingText: "teste", energyLevel })),
      requestedGoal: goal as never,
      crisisSignalLevel: "ABSENT",
    },
  });
  if (createdAt) {
    await prisma.checkIn.update({ where: { id: checkIn.id }, data: { createdAt } });
  }
  return checkIn;
}

async function addCompletedSession(userId: string) {
  await prisma.therapySession.create({
    data: {
      userId,
      templateVersionId,
      personalization: { name: "Ana", pace: "lento" },
      renderedContentEncrypted: encryptField(JSON.stringify({ opening: "teste" })),
      status: "COMPLETED",
      completedAt: new Date(),
    },
  });
}

afterEach(async () => {
  await prisma.therapySession.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.checkIn.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("ReportService — relatório de evolução (Premium)", () => {
  it("recusa gerar relatório para o plano Grátis", async () => {
    const user = await createTestUser(`relatorio-free-${Date.now()}@lexpsique.pt`, "FREE");
    await expect(reportService.getProgressReport(user.id)).rejects.toBeInstanceOf(ReportRequiresPremiumError);
  });

  it("devolve um relatório vazio para uma conta Premium sem atividade", async () => {
    const user = await createTestUser(`relatorio-vazio-${Date.now()}@lexpsique.pt`, "PREMIUM");
    const report = await reportService.getProgressReport(user.id);
    expect(report).toEqual({
      totalCheckIns: 0,
      totalSessionsCompleted: 0,
      favoriteGoal: null,
      averageEnergyLevel: null,
      recentActivity: [],
    });
  });

  it("agrega objetivo favorito, energia média e sessões concluídas", async () => {
    const user = await createTestUser(`relatorio-agregado-${Date.now()}@lexpsique.pt`, "PREMIUM");
    await addCheckIn(user.id, "SLEEP", 3);
    await addCheckIn(user.id, "PAIN", 5);
    await addCheckIn(user.id, "PAIN", 3);
    await addCompletedSession(user.id);
    await addCompletedSession(user.id);

    const report = await reportService.getProgressReport(user.id);
    expect(report.totalCheckIns).toBe(3);
    expect(report.totalSessionsCompleted).toBe(2);
    expect(report.favoriteGoal).toBe("PAIN");
    // O serviço arredonda a 1 casa decimal: (3 + 5 + 3) / 3 = 3.666... -> 3.7
    expect(report.averageEnergyLevel).toBe(3.7);
  });

  it("limita a atividade recente às últimas 10 entradas, mais recentes primeiro", async () => {
    const user = await createTestUser(`relatorio-recente-${Date.now()}@lexpsique.pt`, "PREMIUM");
    const base = new Date("2026-01-01T12:00:00Z");
    for (let i = 0; i < 12; i++) {
      const createdAt = new Date(base.getTime() + i * 86400000);
      await addCheckIn(user.id, "SLEEP", 3, createdAt);
    }

    const report = await reportService.getProgressReport(user.id);
    expect(report.totalCheckIns).toBe(12);
    expect(report.recentActivity).toHaveLength(10);
    const dates = report.recentActivity.map((entry) => entry.date);
    expect(dates).toEqual([...dates].sort().reverse());
  });
});
