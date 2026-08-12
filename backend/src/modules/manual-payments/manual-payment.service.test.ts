import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../../lib/prisma.js";
import {
  ManualPaymentAlreadyReviewedError,
  ManualPaymentRequestNotFoundError,
  ManualPaymentService,
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
      method: "MPESA",
      cadence: "monthly",
      reference: "TX123456",
    });

    expect(request.status).toBe("PENDING");
    expect(request.amountLabel).toBe("199 MT");
    expect(request.market).toBe("MZ");
  });

  it("ativa o Premium ao aprovar, com renovação a 30 dias para o plano mensal", async () => {
    const user = await createTestUser(`manual-approve-monthly-${Date.now()}@lexpsique.pt`);
    const request = await service.submitRequest(user.id, {
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
      method: "MPESA",
      cadence: "monthly",
      reference: "TX-1",
    });
    const second = await service.submitRequest(user.id, {
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
