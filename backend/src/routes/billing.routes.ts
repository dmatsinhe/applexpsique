import { Router } from "express";
import { z } from "zod";
import { BillingService } from "../modules/billing/billing.service.js";
import { ManualPaymentService } from "../modules/manual-payments/manual-payment.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const billingService = new BillingService();
const manualPaymentService = new ManualPaymentService();

// requireAuth aplicado por rota (não via router.use) — este router
// partilha o prefixo /billing com manual-payments.routes.ts, cujo
// GET /payment-contacts é público; um router.use(requireAuth) sem
// caminho bloquearia esse pedido antes de sequer chegar ao outro router.
const checkoutSessionSchema = z.object({
  market: z.enum(["PT", "BR"]),
  cadence: z.enum(["monthly", "annual"]),
});

router.post(
  "/checkout-session",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { market, cadence } = checkoutSessionSchema.parse(req.body);
    const { url } = await billingService.createCheckoutSession(req.userId!, market, cadence);
    res.json({ url });
  }),
);

router.post(
  "/portal-session",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { url } = await billingService.createBillingPortalSession(req.userId!);
    res.json({ url });
  }),
);

router.get(
  "/plan-status",
  requireAuth,
  asyncRoute(async (req, res) => {
    res.json(await manualPaymentService.getPlanStatusForUser(req.userId!));
  }),
);

export default router;
