import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import { encryptField } from "../../lib/encryption.js";
import { AccountService } from "./account.service.js";
import { recordCrisisEvent } from "../crisis/crisis-audit.repository.js";
import { TemplateService } from "../templates/template.service.js";
import { SessionService } from "../sessions/session.service.js";
import type { TemplateContent } from "../templates/template.types.js";

const accountService = new AccountService();
const templateService = new TemplateService();
const sessionService = new SessionService();

let createdUserIds: string[] = [];
const slug = "teste-account-integracao";

function testContent(): TemplateContent {
  return {
    personalizableOpening: "Olá {{nome}}, hoje vamos falar de {{situacao}}.",
    sections: [{ id: "inducao", title: "Indução", body: "Indução de teste." }],
    anchorPhrases: ["Âncora de teste."],
    closing: "Encerramento de teste.",
    paceOptions: ["lento"],
  };
}

async function createTestUser(email: string) {
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: "not-a-real-hash",
      isAdultVerified: true,
      ageVerifiedAt: new Date(),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  await prisma.checkIn.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.therapySession.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.crisisEvent.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("AccountService — autoatendimento de dados (secção 8)", () => {
  it("exporta os dados do utilizador, com respostas de check-in decifradas", async () => {
    const user = await createTestUser(`export-${Date.now()}@lexpsique.pt`);
    await prisma.checkIn.create({
      data: {
        userId: user.id,
        answersEncrypted: encryptField(
          JSON.stringify({ recentFeelingText: "Tenho dormido mal.", energyLevel: 3 }),
        ),
        requestedGoal: "SLEEP",
        crisisSignalLevel: "ABSENT",
      },
    });

    const exported = await accountService.exportData(user.id);
    expect(exported.account.email).toBe(user.email);
    expect(exported.checkIns).toHaveLength(1);
    expect(exported.checkIns[0].answers.recentFeelingText).toBe("Tenho dormido mal.");
    expect(exported.therapySessions).toHaveLength(0);
  });

  it("apaga o histórico mas mantém a conta ativa", async () => {
    const user = await createTestUser(`history-${Date.now()}@lexpsique.pt`);

    const draft = await templateService.submitDraft({
      slug,
      clinicalGoal: "FOCUS",
      title: "Foco (teste account)",
      content: testContent(),
    });
    await templateService.approve(draft.versionId, "fundadora-teste@lexpsique.pt");
    const { sessionId } = await sessionService.createFromMatchedTemplate({
      userId: user.id,
      templateVersionId: draft.versionId,
      personalization: { name: "Ana", pace: "lento" },
    });

    await accountService.deleteHistory(user.id);

    const remainingSessions = await prisma.therapySession.findMany({ where: { userId: user.id } });
    expect(remainingSessions).toHaveLength(0);
    const stillExists = await prisma.user.findUnique({ where: { id: user.id } });
    expect(stillExists).not.toBeNull();

    // limpeza do template de teste
    await prisma.therapySession.deleteMany({ where: { id: sessionId } });
    const template = await prisma.sessionTemplate.findUnique({ where: { slug } });
    if (template) {
      await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
      await prisma.sessionTemplate.delete({ where: { id: template.id } });
    }
  });

  it("apaga a conta por completo, e anonimiza (não apaga) os eventos de auditoria de crise", async () => {
    const user = await createTestUser(`delete-${Date.now()}@lexpsique.pt`);

    await recordCrisisEvent({
      userId: user.id,
      source: "checkin",
      rawText: "texto de teste irrelevante",
      result: { level: "AMBIGUOUS", classifierVersion: "test-v1" },
    });

    const eventsBefore = await prisma.crisisEvent.findMany({ where: { userId: user.id } });
    expect(eventsBefore).toHaveLength(1);
    const eventId = eventsBefore[0].id;

    await accountService.deleteAccount(user.id);

    const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
    expect(userAfter).toBeNull();

    // O evento de crise continua a existir (auditoria de segurança), só o
    // vínculo ao utilizador é removido.
    const eventAfter = await prisma.crisisEvent.findUnique({ where: { id: eventId } });
    expect(eventAfter).not.toBeNull();
    expect(eventAfter?.userId).toBeNull();

    await prisma.crisisEvent.delete({ where: { id: eventId } });
    createdUserIds = createdUserIds.filter((id) => id !== user.id);
  });
});
