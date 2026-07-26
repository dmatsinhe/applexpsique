import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

/**
 * Guarda mínima para os endpoints de aprovação de templates no MVP — NÃO é
 * um sistema de autenticação/autorização de administração real. Antes de
 * lançamento, substituir por um sistema de contas de staff com registo de
 * quem aprovou o quê (o schema já grava `approvedBy`, mas esta guarda não
 * verifica identidade, só posse de um segredo partilhado).
 */
export function requireAdminKey(req: Request, res: Response, next: NextFunction): void {
  const key = req.headers["x-admin-key"];
  if (!env.adminApiKey || key !== env.adminApiKey) {
    res.status(403).json({ error: "Acesso de administração negado." });
    return;
  }
  next();
}
