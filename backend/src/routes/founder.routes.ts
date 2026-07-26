import { Router } from "express";
import { FOUNDER_PROFILE } from "../lib/founder-profile.js";

/**
 * Perfil da fundadora + "Como isto funciona" (secção 4) — conteúdo
 * estático de transparência clínica, gerido fora do código à medida que a
 * fundadora o fornece. Aqui só o endpoint que o serve.
 */
const router = Router();

router.get("/", (_req, res) => {
  const { name, credentials, methodology, howItWorks } = FOUNDER_PROFILE;
  res.json({ name, credentials, methodology, howItWorks });
});

export default router;
