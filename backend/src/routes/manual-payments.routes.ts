import { Router } from "express";
import { z } from "zod";
import { ManualPaymentService } from "../modules/manual-payments/manual-payment.service.js";
import { paymentContacts } from "../modules/manual-payments/manual-payment.types.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const manualPaymentService = new ManualPaymentService();

// Público — mostrado na página de preços antes de sequer haver login.
router.get(
  "/payment-contacts",
  asyncRoute(async (_req, res) => {
    res.json(paymentContacts());
  }),
);

router.use(requireAuth);

const submitSchema = z.object({
  method: z.enum(["PAYPAL", "MPESA", "EMOLA"]),
  cadence: z.enum(["monthly", "annual"]),
  reference: z.string().min(3),
});

router.post(
  "/manual-payment-requests",
  asyncRoute(async (req, res) => {
    const body = submitSchema.parse(req.body);
    const request = await manualPaymentService.submitRequest(req.userId!, body);
    res.status(201).json({ id: request.id, status: request.status });
  }),
);

export default router;
