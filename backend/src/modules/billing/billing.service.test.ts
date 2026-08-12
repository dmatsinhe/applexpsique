import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import { prisma } from "../../lib/prisma.js";

vi.mock("../../config/env.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/env.js")>();
  return {
    ...actual,
    env: {
      ...actual.env,
      frontendUrl: "http://localhost:5173",
      stripeWebhookSecret: "whsec_test",
      stripePricePtMonthly: "price_pt_monthly_test",
      stripePricePtAnnual: "price_pt_annual_test",
      stripePriceBrMonthly: "price_br_monthly_test",
      stripePriceBrAnnual: "price_br_annual_test",
    },
  };
});

const { env } = await import("../../config/env.js");
const { BillingService, BillingNotConfiguredError, PriceNotConfiguredError, NoSubscriptionError } = await import(
  "./billing.service.js"
);

function createFakeStripe(overrides: Record<string, unknown> = {}) {
  return {
    customers: {
      create: vi.fn(async ({ email, metadata }: { email: string; metadata: { userId: string } }) => ({
        id: `cus_${metadata.userId}`,
        email,
      })),
    },
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://checkout.stripe.com/test-session" })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://billing.stripe.com/test-portal" })),
      },
    },
    webhooks: {
      constructEvent: vi.fn((rawBody: Buffer) => JSON.parse(rawBody.toString())),
    },
    ...overrides,
  } as unknown as Stripe;
}

let createdUserIds: string[] = [];

async function createTestUser(email: string, extra: Record<string, unknown> = {}) {
  const user = await prisma.user.create({
    data: { email, passwordHash: "not-a-real-hash", isAdultVerified: true, ageVerifiedAt: new Date(), ...extra },
  });
  createdUserIds.push(user.id);
  return user;
}

afterEach(async () => {
  await prisma.processedStripeEvent.deleteMany({ where: { id: { startsWith: "evt_test_" } } });
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

describe("BillingService — checkout", () => {
  it("recusa criar sessão de checkout quando o Stripe não está configurado", async () => {
    const service = new BillingService(null);
    const user = await createTestUser(`sem-config-${Date.now()}@lexpsique.pt`);
    await expect(service.createCheckoutSession(user.id, "PT", "monthly")).rejects.toBeInstanceOf(
      BillingNotConfiguredError,
    );
  });

  it("cria um cliente Stripe novo, guarda o id, e pede Multibanco só para Portugal", async () => {
    const stripe = createFakeStripe();
    const service = new BillingService(stripe);
    const user = await createTestUser(`checkout-pt-${Date.now()}@lexpsique.pt`);

    const { url } = await service.createCheckoutSession(user.id, "PT", "monthly");

    expect(url).toBe("https://checkout.stripe.com/test-session");
    expect(stripe.customers.create).toHaveBeenCalledTimes(1);
    const checkoutCall = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(checkoutCall.line_items[0].price).toBe(env.stripePricePtMonthly);
    expect(checkoutCall.payment_method_types).toEqual(["card", "paypal", "multibanco"]);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.stripeCustomerId).toBe(`cus_${user.id}`);
  });

  it("não pede Multibanco para o Brasil, e não recria o cliente Stripe se já existir", async () => {
    const stripe = createFakeStripe();
    const service = new BillingService(stripe);
    const user = await createTestUser(`checkout-br-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_ja_existente",
    });

    const { url } = await service.createCheckoutSession(user.id, "BR", "annual");

    expect(url).toBe("https://checkout.stripe.com/test-session");
    expect(stripe.customers.create).not.toHaveBeenCalled();
    const checkoutCall = (stripe.checkout.sessions.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(checkoutCall.customer).toBe("cus_ja_existente");
    expect(checkoutCall.line_items[0].price).toBe(env.stripePriceBrAnnual);
    expect(checkoutCall.payment_method_types).toEqual(["card", "paypal"]);
  });

  it("recusa quando não há preço configurado para o mercado/cadência", async () => {
    const stripe = createFakeStripe();
    const service = new BillingService(stripe);
    const user = await createTestUser(`sem-preco-${Date.now()}@lexpsique.pt`);

    const original = env.stripePriceBrMonthly;
    env.stripePriceBrMonthly = "";
    try {
      await expect(service.createCheckoutSession(user.id, "BR", "monthly")).rejects.toBeInstanceOf(
        PriceNotConfiguredError,
      );
    } finally {
      env.stripePriceBrMonthly = original;
    }
  });
});

describe("BillingService — portal de faturação", () => {
  it("recusa quando a conta não tem nenhuma subscrição associada", async () => {
    const service = new BillingService(createFakeStripe());
    const user = await createTestUser(`sem-subscricao-${Date.now()}@lexpsique.pt`);
    await expect(service.createBillingPortalSession(user.id)).rejects.toBeInstanceOf(NoSubscriptionError);
  });

  it("devolve o URL do portal quando a conta já tem cliente Stripe", async () => {
    const stripe = createFakeStripe();
    const service = new BillingService(stripe);
    const user = await createTestUser(`com-subscricao-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_com_subscricao",
    });

    const { url } = await service.createBillingPortalSession(user.id);
    expect(url).toBe("https://billing.stripe.com/test-portal");
  });
});

describe("BillingService — webhook", () => {
  let stripe: Stripe;
  let service: InstanceType<typeof BillingService>;

  beforeEach(() => {
    stripe = createFakeStripe();
    service = new BillingService(stripe);
  });

  function fireEvent(id: string, type: string, object: Record<string, unknown>) {
    const payload = JSON.stringify({ id, type, data: { object } });
    return service.handleWebhookEvent(Buffer.from(payload), "sig_test");
  }

  it("recusa quando STRIPE_WEBHOOK_SECRET não está configurado", async () => {
    const original = env.stripeWebhookSecret;
    env.stripeWebhookSecret = "";
    try {
      await expect(fireEvent("evt_test_no_secret", "checkout.session.completed", {})).rejects.toBeInstanceOf(
        BillingNotConfiguredError,
      );
    } finally {
      env.stripeWebhookSecret = original;
    }
  });

  it("ativa o plano Premium quando o checkout de subscrição é concluído", async () => {
    const user = await createTestUser(`webhook-checkout-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_webhook_checkout",
    });

    await fireEvent("evt_test_checkout_completed", "checkout.session.completed", {
      mode: "subscription",
      customer: "cus_webhook_checkout",
      subscription: "sub_123",
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("PREMIUM");
    expect(updated.subscriptionStatus).toBe("active");
    expect(updated.stripeSubscriptionId).toBe("sub_123");
  });

  it("sincroniza o plano a partir de customer.subscription.updated (ex: past_due -> Grátis)", async () => {
    const user = await createTestUser(`webhook-sync-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_webhook_sync",
      plan: "PREMIUM",
    });

    const periodEnd = Math.floor(Date.now() / 1000) + 86400;
    await fireEvent("evt_test_subscription_updated", "customer.subscription.updated", {
      id: "sub_456",
      customer: "cus_webhook_sync",
      status: "past_due",
      items: { data: [{ current_period_end: periodEnd }] },
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("FREE");
    expect(updated.subscriptionStatus).toBe("past_due");
    expect(updated.planRenewsAt?.getTime()).toBe(periodEnd * 1000);
  });

  it("volta ao plano Grátis quando a subscrição é cancelada", async () => {
    const user = await createTestUser(`webhook-cancel-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_webhook_cancel",
      plan: "PREMIUM",
      subscriptionStatus: "active",
    });

    await fireEvent("evt_test_subscription_deleted", "customer.subscription.deleted", {
      id: "sub_789",
      customer: "cus_webhook_cancel",
    });

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("FREE");
    expect(updated.subscriptionStatus).toBe("canceled");
    expect(updated.planRenewsAt).toBeNull();
  });

  it("ignora eventos repetidos (idempotência)", async () => {
    const user = await createTestUser(`webhook-idempotente-${Date.now()}@lexpsique.pt`, {
      stripeCustomerId: "cus_webhook_idempotente",
    });

    const event = {
      mode: "subscription",
      customer: "cus_webhook_idempotente",
      subscription: "sub_idempotente",
    };
    await fireEvent("evt_test_idempotente", "checkout.session.completed", event);
    await expect(fireEvent("evt_test_idempotente", "checkout.session.completed", event)).resolves.toBeUndefined();

    const processedCount = await prisma.processedStripeEvent.count({ where: { id: "evt_test_idempotente" } });
    expect(processedCount).toBe(1);
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.plan).toBe("PREMIUM");
  });
});
