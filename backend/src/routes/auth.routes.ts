import { Router } from "express";
import { z } from "zod";
import { AuthService } from "../modules/auth/auth.service.js";
import { issueToken } from "../modules/auth/token.js";
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

export default router;
