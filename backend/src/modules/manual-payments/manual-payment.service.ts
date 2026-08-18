import { prisma } from "../../lib/prisma.js";
import {
  MARKET_PRICES,
  RENEWAL_REMINDER_DAYS,
  paymentMethodsFor,
  type ManualCadence,
  type ManualPaymentMethod,
  type Market,
} from "./manual-payment.types.js";

export interface PlanStatus {
  plan: "FREE" | "PREMIUM";
  subscriptionStatus: string | null;
  planRenewsAt: Date | null;
  daysRemaining: number | null;
  expiringWithinDays: boolean;
}

export class ManualPaymentRequestNotFoundError extends Error {}
export class ManualPaymentAlreadyReviewedError extends Error {}
export class UnavailablePaymentMethodError extends Error {}

/**
 * Nenhum método aqui ativa o Premium sozinho — cada pedido fica PENDING
 * até `approve()` ser chamado por alguém com a chave de administração
 * (ver manual-payments.admin.routes.ts). Mesma regra de "sem aprovação
 * automática" já usada no repositório de templates clínicos.
 */
export class ManualPaymentService {
  async submitRequest(
    userId: string,
    params: { market: Market; method: ManualPaymentMethod; cadence: ManualCadence; reference: string },
  ) {
    if (!paymentMethodsFor(params.market).includes(params.method)) {
      throw new UnavailablePaymentMethodError(
        `${params.method} não está disponível para o mercado ${params.market}.`,
      );
    }

    return prisma.manualPaymentRequest.create({
      data: {
        userId,
        market: params.market,
        method: params.method,
        cadence: params.cadence,
        amountLabel: MARKET_PRICES[params.market][params.cadence],
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

  /**
   * Sem nada a avisar nem a cobrar sozinho, ninguém garante que o plano é
   * desativado no dia certo — por isso não há sweep periódico (nenhum cron
   * configurado): esta verificação corre sempre que alguém olha para o
   * estado do plano, seja o próprio utilizador (getPlanStatusForUser) ou a
   * fundadora (listExpiringSoon), o que cobre os dois caminhos por onde
   * isto é normalmente visto.
   */
  async expireOverdueManualPlans(): Promise<{ downgradedCount: number }> {
    const result = await prisma.user.updateMany({
      where: { subscriptionStatus: "manual_active", planRenewsAt: { lt: new Date() } },
      data: { plan: "FREE", subscriptionStatus: "manual_expired" },
    });
    return { downgradedCount: result.count };
  }

  async listExpiringSoon(withinDays: number = RENEWAL_REMINDER_DAYS) {
    await this.expireOverdueManualPlans();

    const threshold = new Date();
    threshold.setDate(threshold.getDate() + withinDays);

    return prisma.user.findMany({
      where: { subscriptionStatus: "manual_active", planRenewsAt: { lte: threshold } },
      select: { id: true, email: true, planRenewsAt: true },
      orderBy: { planRenewsAt: "asc" },
    });
  }

  async getPlanStatusForUser(userId: string): Promise<PlanStatus> {
    await prisma.user.updateMany({
      where: { id: userId, subscriptionStatus: "manual_active", planRenewsAt: { lt: new Date() } },
      data: { plan: "FREE", subscriptionStatus: "manual_expired" },
    });

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const daysRemaining = user.planRenewsAt
      ? Math.ceil((user.planRenewsAt.getTime() - Date.now()) / 86400000)
      : null;

    return {
      plan: user.plan,
      subscriptionStatus: user.subscriptionStatus,
      planRenewsAt: user.planRenewsAt,
      daysRemaining,
      expiringWithinDays:
        user.subscriptionStatus === "manual_active" &&
        daysRemaining !== null &&
        daysRemaining <= RENEWAL_REMINDER_DAYS,
    };
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
