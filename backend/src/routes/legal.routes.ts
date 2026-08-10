import { Router } from "express";
import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Serve documentos legais a partir da fonte única em src/legal — nunca
 * uma cópia duplicada no frontend, para nunca divergirem. Sem
 * autenticação: a política de privacidade tem de poder ser lida antes de
 * sequer criar conta.
 *
 * Resolvido a partir de process.cwd() (não de __dirname): o build do
 * TypeScript (tsc) não copia ficheiros .md para dist/, mas tanto `npm run
 * dev` (tsx, a partir de backend/) como `npm run start` (node dist/, via
 * o startCommand do Render, também a partir do rootDir backend/) correm
 * sempre com backend/ como diretório de trabalho — por isso o caminho do
 * ficheiro fonte em backend/src/legal/ continua válido em ambos os casos.
 */
const router = Router();

const PRIVACY_POLICY_PATH = path.join(process.cwd(), "src", "legal", "politica-privacidade.md");

router.get("/privacy-policy", async (_req, res) => {
  try {
    const markdown = await readFile(PRIVACY_POLICY_PATH, "utf8");
    res.type("text/plain").send(markdown);
  } catch {
    res.status(500).json({ error: "Não foi possível carregar a política de privacidade." });
  }
});

export default router;
