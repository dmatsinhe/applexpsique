import { Router } from "express";
import { z } from "zod";
import { ManualPaymentService } from "../modules/manual-payments/manual-payment.service.js";
import { requireAdminKey } from "../middleware/requireAdminKey.js";
import { asyncRoute } from "../middleware/errorHandler.js";

/**
 * Confirmação manual dos pagamentos (PayPal, transferência bancária,
 * M-Pesa, e-Mola) — ver manual-payment.service.ts. Mesmo mecanismo de
 * guarda que os endpoints de aprovação de templates (chave partilhada,
 * não é um sistema de contas de staff real).
 */
const router = Router();
const manualPaymentService = new ManualPaymentService();

router.use(requireAdminKey);

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    res.json(await manualPaymentService.listPending());
  }),
);

// Também corre o sweep de expiração antes de listar — cobre o caso de a
// fundadora ser a primeira a olhar para isto depois de um plano expirar,
// sem depender de o próprio utilizador ter voltado a abrir a app.
router.get(
  "/expiring-soon",
  asyncRoute(async (_req, res) => {
    res.json(await manualPaymentService.listExpiringSoon());
  }),
);

const reviewSchema = z.object({ reviewedBy: z.string().min(1) });

router.post(
  "/:id/approve",
  asyncRoute(async (req, res) => {
    const { reviewedBy } = reviewSchema.parse(req.body);
    await manualPaymentService.approve(req.params.id, reviewedBy);
    res.status(204).send();
  }),
);

const rejectSchema = z.object({ reviewedBy: z.string().min(1), note: z.string().optional() });

router.post(
  "/:id/reject",
  asyncRoute(async (req, res) => {
    const { reviewedBy, note } = rejectSchema.parse(req.body);
    await manualPaymentService.reject(req.params.id, reviewedBy, note);
    res.status(204).send();
  }),
);

export default router;
