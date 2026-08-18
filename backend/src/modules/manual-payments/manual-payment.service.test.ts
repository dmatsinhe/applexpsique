import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import {
  ManualPaymentAlreadyReviewedError,
  ManualPaymentRequestNotFoundError,
  ManualPaymentService,
  UnavailablePaymentMethodError,
} from "./manual-payment.service.js";

const service = new ManualPaymentService();

let createdUserIds: string[] = [];

async function createTestUser(email: string) {
  const user = await prisma.user.create({
    data: { email, passwordHash: "not-a-real-hash", isAdultVerified: true, ageVerifiedAt: new Date() },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  await prisma.manualPaymentRequest.deleteMany({ where: { userId: { in: createdUserIds } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("ManualPaymentService", () => {
  it("cria um pedido PENDING com o valor certo para o mercado/cadência", async () => {
    const user = await createTestUser(`manual-submit-${Date.now()}@lexpsique.pt`);

    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "MPESA",
      cadence: "monthly",
      reference: "TX123456",
    });

    expect(request.status).toBe("PENDING");
    expect(request.amountLabel).toBe("199 MT");
    expect(request.market).toBe("MZ");
  });

  it("usa o preço certo para Portugal e Brasil", async () => {
    const user = await createTestUser(`manual-precos-${Date.now()}@lexpsique.pt`);

    const pt = await service.submitRequest(user.id, {
      market: "PT",
      method: "PAYPAL",
      cadence: "monthly",
      reference: "TX-pt",
    });
    expect(pt.amountLabel).toBe("€5,99");

    const br = await service.submitRequest(user.id, {
      market: "BR",
      method: "BANK_TRANSFER",
      cadence: "annual",
      reference: "TX-br",
    });
    expect(br.amountLabel).toBe("R$159,90");
  });

  it("aceita transferência bancária como método em qualquer mercado", async () => {
    const user = await createTestUser(`manual-banco-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "BANK_TRANSFER",
      cadence: "monthly",
      reference: "TX-banco",
    });
    expect(request.method).toBe("BANK_TRANSFER");
  });

  it("recusa M-Pesa e e-Mola fora de Moçambique", async () => {
    const user = await createTestUser(`manual-metodo-invalido-${Date.now()}@lexpsique.pt`);

    await expect(
      service.submitRequest(user.id, { market: "PT", method: "MPESA", cadence: "monthly", reference: "TX-1" }),
    ).rejects.toBeInstanceOf(UnavailablePaymentMethodError);

    await expect(
      service.submitRequest(user.id, { market: "BR", method: "EMOLA", cadence: "monthly", reference: "TX-2" }),
    ).rejects.toBeInstanceOf(UnavailablePaymentMethodError);
  });

  it("ativa o Premium ao aprovar, com renovação a 30 dias para o plano mensal", async () => {
    const user = await createTestUser(`manual-approve-monthly-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "EMOLA",
      cadence: "monthly",
      reference: "TX-emola-1",
    });

    const before = Date.now();
    await service.approve(request.id, "fundadora-teste@lexpsique.pt");
    const after = Date.now();

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.plan).toBe("PREMIUM");
    expect(updatedUser.subscriptionStatus).toBe("manual_active");
    const renewsAtMs = updatedUser.planRenewsAt!.getTime();
    expect(renewsAtMs).toBeGreaterThan(before + 29 * 86400 * 1000);
    expect(renewsAtMs).toBeLessThan(after + 31 * 86400 * 1000);

    const updatedRequest = await prisma.manualPaymentRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("APPROVED");
    expect(updatedRequest.reviewedBy).toBe("fundadora-teste@lexpsique.pt");
  });

  it("usa renovação a 365 dias para o plano anual", async () => {
    const user = await createTestUser(`manual-approve-annual-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "PAYPAL",
      cadence: "annual",
      reference: "TX-paypal-1",
    });

    await service.approve(request.id, "fundadora-teste@lexpsique.pt");

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const daysUntilRenewal = (updatedUser.planRenewsAt!.getTime() - Date.now()) / 86400000;
    expect(daysUntilRenewal).toBeGreaterThan(360);
    expect(daysUntilRenewal).toBeLessThan(366);
  });

  it("rejeita um pedido sem ativar o Premium", async () => {
    const user = await createTestUser(`manual-reject-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "MPESA",
      cadence: "monthly",
      reference: "TX-invalido",
    });

    await service.reject(request.id, "fundadora-teste@lexpsique.pt", "Referência não encontrada");

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.plan).toBe("FREE");

    const updatedRequest = await prisma.manualPaymentRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updatedRequest.status).toBe("REJECTED");
    expect(updatedRequest.reviewNote).toBe("Referência não encontrada");
  });

  it("recusa rever duas vezes o mesmo pedido", async () => {
    const user = await createTestUser(`manual-doublereview-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "MPESA",
      cadence: "monthly",
      reference: "TX-duplo",
    });

    await service.approve(request.id, "fundadora-teste@lexpsique.pt");
    await expect(service.approve(request.id, "fundadora-teste@lexpsique.pt")).rejects.toBeInstanceOf(
      ManualPaymentAlreadyReviewedError,
    );
  });

  it("recusa rever um pedido inexistente", async () => {
    await expect(service.approve("id-que-nao-existe", "fundadora-teste@lexpsique.pt")).rejects.toBeInstanceOf(
      ManualPaymentRequestNotFoundError,
    );
  });

  it("lista só os pedidos PENDING, por ordem de criação", async () => {
    const user = await createTestUser(`manual-list-${Date.now()}@lexpsique.pt`);
    const first = await service.submitRequest(user.id, {
      market: "MZ",
      method: "MPESA",
      cadence: "monthly",
      reference: "TX-1",
    });
    const second = await service.submitRequest(user.id, {
      market: "MZ",
      method: "EMOLA",
      cadence: "monthly",
      reference: "TX-2",
    });
    await service.reject(second.id, "fundadora-teste@lexpsique.pt");

    const pending = await service.listPending();
    const pendingIds = pending.map((r) => r.id);
    expect(pendingIds).toContain(first.id);
    expect(pendingIds).not.toContain(second.id);
  });
});

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

describe("ManualPaymentService — expiração automática", () => {
  it("desativa o Premium de um plano manual cuja renovação já passou", async () => {
    const user = await createTestUser(`manual-expired-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(-1) },
    });

    const { downgradedCount } = await service.expireOverdueManualPlans();
    expect(downgradedCount).toBeGreaterThanOrEqual(1);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("FREE");
    expect(updated.subscriptionStatus).toBe("manual_expired");
  });

  it("não toca num plano manual cuja renovação ainda não chegou", async () => {
    const user = await createTestUser(`manual-not-expired-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(10) },
    });

    await service.expireOverdueManualPlans();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("PREMIUM");
    expect(updated.subscriptionStatus).toBe("manual_active");
  });

  it("nunca toca num plano com outro estado de subscrição, mesmo com data de renovação no passado", async () => {
    const user = await createTestUser(`manual-outro-estado-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PREMIUM", subscriptionStatus: "active", planRenewsAt: daysFromNow(-1) },
    });

    await service.expireOverdueManualPlans();

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("PREMIUM");
    expect(updated.subscriptionStatus).toBe("active");
  });

  it("lista só quem expira dentro da janela de aviso, e limpa quem já expirou", async () => {
    const expiringSoon = await createTestUser(`manual-expiring-soon-${Date.now()}@lexpsique.pt`);
    const notSoon = await createTestUser(`manual-expiring-later-${Date.now()}@lexpsique.pt`);
    const alreadyExpired = await createTestUser(`manual-already-expired-${Date.now()}@lexpsique.pt`);

    await prisma.user.update({
      where: { id: expiringSoon.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(1) },
    });
    await prisma.user.update({
      where: { id: notSoon.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(10) },
    });
    await prisma.user.update({
      where: { id: alreadyExpired.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(-1) },
    });

    const expiring = await service.listExpiringSoon();
    const expiringIds = expiring.map((u) => u.id);
    expect(expiringIds).toContain(expiringSoon.id);
    expect(expiringIds).not.toContain(notSoon.id);
    expect(expiringIds).not.toContain(alreadyExpired.id);

    const cleanedUp = await prisma.user.findUniqueOrThrow({ where: { id: alreadyExpired.id } });
    expect(cleanedUp.plan).toBe("FREE");
  });

  it("getPlanStatusForUser reporta a contagem de dias e o aviso de expiração", async () => {
    const soon = await createTestUser(`manual-status-soon-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: soon.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(2) },
    });
    const soonStatus = await service.getPlanStatusForUser(soon.id);
    expect(soonStatus.plan).toBe("PREMIUM");
    expect(soonStatus.expiringWithinDays).toBe(true);
    expect(soonStatus.daysRemaining).toBeLessThanOrEqual(3);

    const later = await createTestUser(`manual-status-later-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: later.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(10) },
    });
    const laterStatus = await service.getPlanStatusForUser(later.id);
    expect(laterStatus.expiringWithinDays).toBe(false);

    const free = await createTestUser(`manual-status-free-${Date.now()}@lexpsique.pt`);
    const freeStatus = await service.getPlanStatusForUser(free.id);
    expect(freeStatus.plan).toBe("FREE");
    expect(freeStatus.daysRemaining).toBeNull();
    expect(freeStatus.expiringWithinDays).toBe(false);
  });

  it("getPlanStatusForUser desativa o Premium na hora se a renovação já passou", async () => {
    const user = await createTestUser(`manual-status-expired-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: daysFromNow(-1) },
    });

    const status = await service.getPlanStatusForUser(user.id);
    expect(status.plan).toBe("FREE");
    expect(status.subscriptionStatus).toBe("manual_expired");
    expect(status.expiringWithinDays).toBe(false);
  });

  it("um novo pagamento aprovado reativa o Premium depois de expirar", async () => {
    const user = await createTestUser(`manual-reactivate-${Date.now()}@lexpsique.pt`);
    await prisma.user.update({
      where: { id: user.id },
      data: { plan: "FREE", subscriptionStatus: "manual_expired", planRenewsAt: daysFromNow(-5) },
    });

    const request = await service.submitRequest(user.id, {
      market: "MZ",
      method: "MPESA",
      cadence: "monthly",
      reference: "TX-reativacao",
    });
    await service.approve(request.id, "fundadora-teste@lexpsique.pt");

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("PREMIUM");
    expect(updated.subscriptionStatus).toBe("manual_active");
    expect(updated.planRenewsAt!.getTime()).toBeGreaterThan(Date.now());
  });
});
