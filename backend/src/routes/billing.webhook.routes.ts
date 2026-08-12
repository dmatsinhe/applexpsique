import express, { Router } from "express";
import { BillingService } from "../modules/billing/billing.service.js";
import { asyncRoute } from "../middleware/errorHandler.js";

/**
 * Montado em server.ts ANTES de express.json() — a verificação de
 * assinatura do Stripe precisa do corpo em bruto (raw), não do JSON já
 * interpretado. Nunca autenticado por token: quem chama esta rota é o
 * Stripe, verificado pela assinatura, não um utilizador da app.
 */
const router = Router();
const billingService = new BillingService();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  asyncRoute(async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (typeof signature !== "string") {
      res.status(400).json({ error: "Assinatura Stripe em falta." });
      return;
    }
    await billingService.handleWebhookEvent(req.body as Buffer, signature);
    res.status(200).json({ received: true });
  }),
);

export default router;
