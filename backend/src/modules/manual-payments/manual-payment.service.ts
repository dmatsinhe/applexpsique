import { prisma } from "../../lib/prisma.js";
import { MZ_PRICES, type ManualCadence, type ManualPaymentMethod } from "./manual-payment.types.js";

export class ManualPaymentRequestNotFoundError extends Error {}
export class ManualPaymentAlreadyReviewedError extends Error {}

/**
 * Nenhum método aqui ativa o Premium sozinho — cada pedido fica PENDING
 * até `approve()` ser chamado por alguém com a chave de administração
 * (ver manual-payments.admin.routes.ts). Mesma regra de "sem aprovação
 * automática" já usada no repositório de templates clínicos.
 */
export class ManualPaymentService {
  async submitRequest(
    userId: string,
    params: { method: ManualPaymentMethod; cadence: ManualCadence; reference: string },
  ) {
    return prisma.manualPaymentRequest.create({
      data: {
        userId,
        market: "MZ",
        method: params.method,
        cadence: params.cadence,
        amountLabel: MZ_PRICES[params.cadence],
        reference: params.reference,
      },
    });
  }

  async listPending() {
    return prisma.manualPaymentRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      include: { user: { select: { email: true } } },
    });
  }

  async approve(id: string, reviewedBy: string): Promise<void> {
    const request = await this.requireReviewable(id);

    const renewsAt = new Date();
    renewsAt.setDate(renewsAt.getDate() + (request.cadence === "annual" ? 365 : 30));

    await prisma.$transaction([
      prisma.manualPaymentRequest.update({
        where: { id },
        data: { status: "APPROVED", reviewedBy, reviewedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: request.userId },
        data: { plan: "PREMIUM", subscriptionStatus: "manual_active", planRenewsAt: renewsAt },
      }),
    ]);
  }

  async reject(id: string, reviewedBy: string, note?: string): Promise<void> {
    await this.requireReviewable(id);
    await prisma.manualPaymentRequest.update({
      where: { id },
      data: { status: "REJECTED", reviewedBy, reviewedAt: new Date(), reviewNote: note },
    });
  }

  private async requireReviewable(id: string) {
    const request = await prisma.manualPaymentRequest.findUnique({ where: { id } });
    if (!request) {
      throw new ManualPaymentRequestNotFoundError("Pedido de pagamento não encontrado.");
    }
    if (request.status !== "PENDING") {
      throw new ManualPaymentAlreadyReviewedError("Este pedido já foi revisto.");
    }
    return request;
  }
}
