import Stripe from "stripe";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import {
  checkoutLocaleFor,
  paymentMethodTypesFor,
  priceIdFor,
  type BillingCadence,
  type BillingMarket,
} from "./billing.types.js";

export class BillingNotConfiguredError extends Error {}
export class PriceNotConfiguredError extends Error {}
export class NoSubscriptionError extends Error {}

/**
 * O cliente Stripe é passado por injeção (em vez de um singleton do
 * módulo) para que os testes possam substituí-lo por um duplo de teste —
 * nunca chamamos a API real do Stripe fora de produção.
 */
export class BillingService {
  private readonly stripe: Stripe | null;

  constructor(stripe?: Stripe | null) {
    this.stripe = stripe !== undefined ? stripe : env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new BillingNotConfiguredError(
        "A faturação ainda não está configurada nesta instância. Tente novamente mais tarde.",
      );
    }
    return this.stripe;
  }

  async createCheckoutSession(
    userId: string,
    market: BillingMarket,
    cadence: BillingCadence,
  ): Promise<{ url: string }> {
    const stripe = this.requireStripe();

    const priceId = priceIdFor(market, cadence);
    if (!priceId) {
      throw new PriceNotConfiguredError(`Ainda não há preço configurado para ${market}/${cadence}.`);
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const customerId = await this.getOrCreateCustomerId(stripe, user);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      payment_method_types: paymentMethodTypesFor(market) as Stripe.Checkout.SessionCreateParams.PaymentMethodType[],
      line_items: [{ price: priceId, quantity: 1 }],
      locale: checkoutLocaleFor(market),
      success_url: `${env.frontendUrl}/?checkout=success`,
      cancel_url: `${env.frontendUrl}/?checkout=cancelado`,
    });

    if (!session.url) {
      throw new Error("O Stripe não devolveu um URL de checkout.");
    }
    return { url: session.url };
  }

  async createBillingPortalSession(userId: string): Promise<{ url: string }> {
    const stripe = this.requireStripe();

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.stripeCustomerId) {
      throw new NoSubscriptionError("Esta conta ainda não tem nenhuma subscrição associada.");
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${env.frontendUrl}/`,
    });
    return { url: session.url };
  }

  /**
   * Idempotente por design (o Stripe reenvia eventos): cada evento
   * processado fica registado em `processed_stripe_events` antes de
   * devolver sucesso, e eventos repetidos são ignorados silenciosamente.
   */
  async handleWebhookEvent(rawBody: Buffer, signature: string): Promise<void> {
    const stripe = this.requireStripe();
    if (!env.stripeWebhookSecret) {
      throw new BillingNotConfiguredError("STRIPE_WEBHOOK_SECRET não está configurado.");
    }

    const event = stripe.webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);

    const alreadyProcessed = await prisma.processedStripeEvent.findUnique({ where: { id: event.id } });
    if (alreadyProcessed) return;

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.customer && session.subscription) {
          await this.activateSubscription(String(session.customer), String(session.subscription));
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.syncSubscription(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await this.downgradeToFree(String(subscription.customer));
        break;
      }
      default:
        break;
    }

    await prisma.processedStripeEvent.create({ data: { id: event.id } });
  }

  private async getOrCreateCustomerId(
    stripe: Stripe,
    user: { id: string; email: string; stripeCustomerId: string | null },
  ): Promise<string> {
    if (user.stripeCustomerId) return user.stripeCustomerId;

    const customer = await stripe.customers.create({ email: user.email, metadata: { userId: user.id } });
    await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
    return customer.id;
  }

  private async activateSubscription(stripeCustomerId: string, stripeSubscriptionId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { stripeCustomerId },
      data: { plan: "PREMIUM", stripeSubscriptionId, subscriptionStatus: "active" },
    });
  }

  private async syncSubscription(subscription: Stripe.Subscription): Promise<void> {
    const isActive = subscription.status === "active" || subscription.status === "trialing";
    const currentPeriodEnd = subscription.items.data[0]?.current_period_end;
    await prisma.user.updateMany({
      where: { stripeCustomerId: String(subscription.customer) },
      data: {
        plan: isActive ? "PREMIUM" : "FREE",
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        planRenewsAt: currentPeriodEnd ? new Date(currentPeriodEnd * 1000) : null,
      },
    });
  }

  private async downgradeToFree(stripeCustomerId: string): Promise<void> {
    await prisma.user.updateMany({
      where: { stripeCustomerId },
      data: { plan: "FREE", subscriptionStatus: "canceled", planRenewsAt: null },
    });
  }
}
