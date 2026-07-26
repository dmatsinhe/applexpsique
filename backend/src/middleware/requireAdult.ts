import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../modules/auth/auth.repository.js";

/**
 * Bloqueia qualquer rota clínica (check-in, sessões) para contas sem
 * verificação de idade ativa (secção 5.1) — incluindo contas cuja
 * verificação tenha sido revogada por suspeita de menoridade
 * (`revokeAdultVerification`). Nunca deixa o fluxo normal continuar nesse
 * caso.
 */
export async function requireAdult(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.userId) {
    res.status(401).json({ error: "Autenticação necessária." });
    return;
  }

  const user = await findUserById(req.userId);
  if (!user.isAdultVerified) {
    res.status(403).json({
      error:
        "Esta aplicação é exclusiva para adultos (18+). O acesso a conteúdo clínico está bloqueado.",
    });
    return;
  }

  next();
}
