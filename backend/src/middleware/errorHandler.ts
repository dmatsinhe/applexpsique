import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { DailySessionLimitReachedError } from "../modules/sessions/session.service.js";
import { ReportRequiresPremiumError } from "../modules/reports/report.service.js";

export function asyncRoute<T extends (req: Request, res: Response) => Promise<void>>(handler: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction): void {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Dados inválidos.", details: err.issues });
    return;
  }
  if (err instanceof DailySessionLimitReachedError) {
    res.status(402).json({ error: err.message });
    return;
  }
  if (err instanceof ReportRequiresPremiumError) {
    res.status(402).json({ error: err.message });
    return;
  }
  if (err instanceof Error) {
    // Erros de domínio lançados pelos serviços são sempre 400 aqui — nenhum
    // deles expõe stack trace ao cliente.
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Erro interno." });
}
