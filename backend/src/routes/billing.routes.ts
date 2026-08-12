import { Router } from "express";
import { z } from "zod";
import { BillingService } from "../modules/billing/billing.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const billingService = new BillingService();

router.use(requireAuth);

const checkoutSessionSchema = z.object({
  market: z.enum(["PT", "BR"]),
  cadence: z.enum(["monthly", "annual"]),
});

router.post(
  "/checkout-session",
  asyncRoute(async (req, res) => {
    const { market, cadence } = checkoutSessionSchema.parse(req.body);
    const { url } = await billingService.createCheckoutSession(req.userId!, market, cadence);
    res.json({ url });
  }),
);

router.post(
  "/portal-session",
  asyncRoute(async (req, res) => {
    const { url } = await billingService.createBillingPortalSession(req.userId!);
    res.json({ url });
  }),
);

export default router;
