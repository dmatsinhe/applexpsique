import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./server.js";
import { prisma } from "./lib/prisma.js";
import { TemplateService } from "./modules/templates/template.service.js";
import { env } from "./config/env.js";
import type { TemplateContent } from "./modules/templates/template.types.js";

const app = createApp();
const templateService = new TemplateService();

const slug = "teste-e2e-ansiedade";

function testContent(): TemplateContent {
  return {
    induction: "Indução fixa E2E.",
    coreSuggestions: ["Sugestão E2E 1"],
    anchorPhrases: ["Âncora E2E"],
    closing: "Encerramento fixo E2E.",
    personalizableOpening: "Olá {{nome}}, hoje vamos abordar {{situacao}}.",
    paceOptions: ["lento", "moderado"],
  };
}

async function cleanup(email?: string) {
  const template = await prisma.sessionTemplate.findUnique({ where: { slug } });
  if (template) {
    const versions = await prisma.templateVersion.findMany({ where: { templateId: template.id } });
    await prisma.therapySession.deleteMany({ where: { templateVersionId: { in: versions.map((v) => v.id) } } });
    await prisma.checkIn.updateMany({
      where: { matchedTemplateVersionId: { in: versions.map((v) => v.id) } },
      data: { matchedTemplateVersionId: null },
    });
    await prisma.templateVersion.deleteMany({ where: { templateId: template.id } });
    await prisma.sessionTemplate.delete({ where: { id: template.id } });
  }
  if (email) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.checkIn.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
  }
}

describe("API E2E — fluxo MVP passo 1 (registo → check-in → sessão)", () => {
  const email = `e2e-${Date.now()}@lexpsique.pt`;

  beforeAll(async () => {
    await cleanup(email);
  });

  afterAll(async () => {
    await cleanup(email);
    await prisma.$disconnect();
  });

  it("recusa registo de menor de idade via API", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ email: `menor-${Date.now()}@lexpsique.pt`, password: "password123", birthDate: "2015-01-01" });
    expect(res.status).toBe(400);
  });

  it("percorre o fluxo completo: registo → check-in → sessão personalizada", async () => {
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ email, password: "password123", birthDate: "1990-05-15" });
    expect(registerRes.status).toBe(201);
    const token = registerRes.body.token as string;

    // Sem template aprovado ainda para GENERALIZED_ANXIETY -> recusa explícita.
    const beforeApprovalRes = await request(app)
      .post("/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({
        requestedGoal: "GENERALIZED_ANXIETY",
        recentFeelingText: "Tenho estado ansioso com o trabalho.",
        energyLevel: 3,
      });
    expect(beforeApprovalRes.status).toBe(201);
    expect(beforeApprovalRes.body.kind).toBe("no_template_available");

    // Aprova um template via endpoint admin protegido por chave partilhada.
    const draftRes = await request(app)
      .post("/admin/templates/draft")
      .set("x-admin-key", env.adminApiKey)
      .send({ slug, clinicalGoal: "GENERALIZED_ANXIETY", title: "Ansiedade (E2E)", content: testContent() });
    expect(draftRes.status).toBe(201);

    const unauthorizedApprove = await request(app)
      .post(`/admin/templates/${draftRes.body.versionId}/approve`)
      .send({ approvedBy: "attacker" });
    expect(unauthorizedApprove.status).toBe(403);

    const approveRes = await request(app)
      .post(`/admin/templates/${draftRes.body.versionId}/approve`)
      .set("x-admin-key", env.adminApiKey)
      .send({ approvedBy: "fundadora-e2e@lexpsique.pt" });
    expect(approveRes.status).toBe(204);

    // Agora o check-in encontra o template.
    const checkinRes = await request(app)
      .post("/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({
        requestedGoal: "GENERALIZED_ANXIETY",
        recentFeelingText: "Tenho estado ansioso com o trabalho.",
        situationNote: "uma entrevista de emprego",
        energyLevel: 3,
      });
    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.kind).toBe("matched");

    // Cria a sessão personalizada a partir do template correspondido.
    const sessionRes = await request(app)
      .post("/sessions")
      .set("Authorization", `Bearer ${token}`)
      .send({
        templateVersionId: checkinRes.body.templateVersionId,
        personalization: { name: "Joana", situationNote: "a entrevista de amanhã", pace: "lento" },
      });
    expect(sessionRes.status).toBe(201);
    expect(sessionRes.body.rendered.opening).toBe("Olá Joana, hoje vamos abordar a entrevista de amanhã.");

    // Retoma: guarda posição e recupera.
    const resumeRes = await request(app)
      .patch(`/sessions/${sessionRes.body.sessionId}/resume-position`)
      .set("Authorization", `Bearer ${token}`)
      .send({ positionSeconds: 42 });
    expect(resumeRes.status).toBe(204);

    const getRes = await request(app)
      .get(`/sessions/${sessionRes.body.sessionId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.resumePositionSeconds).toBe(42);
  });

  it("sinal claro de crise (plano) no check-in bloqueia a sessão automatizada e devolve os 3 blocos de recursos", async () => {
    const loginRes = await request(app).post("/auth/login").send({ email, password: "password123" });
    const token = loginRes.body.token as string;

    const res = await request(app)
      .post("/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({
        requestedGoal: "GENERALIZED_ANXIETY",
        recentFeelingText: "Já tenho um plano para morrer, só falta a coragem.",
        energyLevel: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.kind).toBe("crisis_clear");
    expect(
      res.body.response.immediateResources.some((r: { name: string }) => r.name.includes("1411")),
    ).toBe(true);
    expect(res.body.response.regionalProfessionalSupport.length).toBeGreaterThan(0);
    expect(res.body.response.founderPrivateContact.disclaimerLabel).toContain("NÃO");
    expect(res.body.noRealTimeSupervisionNotice).toBeTruthy();
  });

  it("menção direta a suicídio pede esclarecimento via API antes de decidir a gravidade final", async () => {
    const loginRes = await request(app).post("/auth/login").send({ email, password: "password123" });
    const token = loginRes.body.token as string;

    const checkinRes = await request(app)
      .post("/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({
        requestedGoal: "GENERALIZED_ANXIETY",
        recentFeelingText: "Não aguento mais viver, quero morrer.",
        energyLevel: 1,
      });

    expect(checkinRes.status).toBe(201);
    expect(checkinRes.body.kind).toBe("crisis_needs_clarification");
    expect(checkinRes.body.clarification.level).toBe("DIRECT_MENTION");

    const escalateRes = await request(app)
      .post(`/checkin/${checkinRes.body.checkInId}/clarify-crisis`)
      .set("Authorization", `Bearer ${token}`)
      .send({ resolution: "ESCALATE" });

    expect(escalateRes.status).toBe(200);
    expect(escalateRes.body.kind).toBe("crisis_clear");
  });

  it("rejeita rotas clínicas sem token de autenticação", async () => {
    const res = await request(app).post("/checkin").send({});
    expect(res.status).toBe(401);
  });

  it("autoatendimento de dados: exportar, apagar histórico, apagar conta (secção 8)", async () => {
    const accountEmail = `e2e-account-${Date.now()}@lexpsique.pt`;
    const registerRes = await request(app)
      .post("/auth/register")
      .send({ email: accountEmail, password: "password123", birthDate: "1990-05-15" });
    const token = registerRes.body.token as string;

    await request(app)
      .post("/checkin")
      .set("Authorization", `Bearer ${token}`)
      .send({
        requestedGoal: "GENERALIZED_ANXIETY",
        recentFeelingText: "Sem sinais de crise, só ansiedade normal do dia a dia.",
        energyLevel: 3,
      });

    const exportRes = await request(app).get("/account/export").set("Authorization", `Bearer ${token}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.body.account.email).toBe(accountEmail);
    expect(exportRes.body.checkIns).toHaveLength(1);

    const deleteHistoryRes = await request(app)
      .delete("/account/history")
      .set("Authorization", `Bearer ${token}`);
    expect(deleteHistoryRes.status).toBe(204);

    const exportAfterHistoryDelete = await request(app)
      .get("/account/export")
      .set("Authorization", `Bearer ${token}`);
    expect(exportAfterHistoryDelete.body.checkIns).toHaveLength(0);

    const deleteAccountRes = await request(app).delete("/account").set("Authorization", `Bearer ${token}`);
    expect(deleteAccountRes.status).toBe(204);

    // A conta já não existe — o mesmo token deixa de servir para nada.
    const loginAfterDelete = await request(app)
      .post("/auth/login")
      .send({ email: accountEmail, password: "password123" });
    expect(loginAfterDelete.status).toBe(401);
  });

  it("rejeita exportar/apagar dados sem autenticação", async () => {
    expect((await request(app).get("/account/export")).status).toBe(401);
    expect((await request(app).delete("/account/history")).status).toBe(401);
    expect((await request(app).delete("/account")).status).toBe(401);
  });
});
