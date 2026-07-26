import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../modules/auth/auth.service.js";
import { issueToken } from "../modules/auth/token.js";
import { CRISIS_CONSENT_EXPLANATION } from "../modules/auth/consent.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const authService = new AuthService();

router.post(
  "/register",
  asyncRoute(async (req, res) => {
    const { userId } = await authService.register(req.body);
    res.status(201).json({ userId, token: issueToken(userId) });
  }),
);

const loginSchema = z.object({ email: z.string().email(), password: z.string() });

router.post(
  "/login",
  asyncRoute(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.verifyCredentials(email, password);
    if (!result) {
      res.status(401).json({ error: "Credenciais inválidas." });
      return;
    }
    res.json({ userId: result.userId, token: issueToken(result.userId) });
  }),
);

router.get("/crisis-consent-explanation", (_req, res) => {
  res.json(CRISIS_CONSENT_EXPLANATION);
});

const crisisConsentSchema = z.object({
  // Sem default no schema — obrigatório o cliente enviar uma escolha ativa
  // (secção 5: "nunca pré-selecionado por defeito").
  notifyOnClearSignal: z.boolean(),
});

router.post(
  "/consent/crisis-notify",
  requireAuth,
  asyncRoute(async (req, res) => {
    const { notifyOnClearSignal } = crisisConsentSchema.parse(req.body);
    await authService.setCrisisConsent(req.userId!, notifyOnClearSignal);
    res.status(204).send();
  }),
);

export default router;
