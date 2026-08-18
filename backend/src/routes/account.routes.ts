import { Router } from "express";
import { AccountService } from "../modules/account/account.service.js";
import { ReportService } from "../modules/reports/report.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { asyncRoute } from "../middleware/errorHandler.js";

/**
 * Autoatendimento de dados (secção 8). Todas as rotas exigem autenticação
 * — cada utilizador só acede aos seus próprios dados (nunca um parâmetro
 * de utilizador na URL; sempre `req.userId` do token).
 */
const router = Router();
const accountService = new AccountService();
const reportService = new ReportService();

router.use(requireAuth);

router.get(
  "/progress-report",
  asyncRoute(async (req, res) => {
    res.json(await reportService.getProgressReport(req.userId!));
  }),
);

router.get(
  "/export",
  asyncRoute(async (req, res) => {
    const data = await accountService.exportData(req.userId!);
    res.setHeader("Content-Disposition", 'attachment; filename="cuidamente-dados.json"');
    res.json(data);
  }),
);

router.delete(
  "/history",
  asyncRoute(async (req, res) => {
    await accountService.deleteHistory(req.userId!);
    res.status(204).send();
  }),
);

router.delete(
  "/",
  asyncRoute(async (req, res) => {
    await accountService.deleteAccount(req.userId!);
    res.status(204).send();
  }),
);

export default router;
