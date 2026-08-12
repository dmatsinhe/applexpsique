import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import authRoutes from "./routes/auth.routes.js";
import checkinRoutes from "./routes/checkin.routes.js";
import sessionsRoutes from "./routes/sessions.routes.js";
import templatesRoutes from "./routes/templates.routes.js";
import founderRoutes from "./routes/founder.routes.js";
import accountRoutes from "./routes/account.routes.js";
import legalRoutes from "./routes/legal.routes.js";
import billingRoutes from "./routes/billing.routes.js";
import billingWebhookRoutes from "./routes/billing.webhook.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigins.length > 0 ? env.corsOrigins : true }));

  // Antes de express.json(): a verificação de assinatura do webhook Stripe
  // precisa do corpo em bruto, não do JSON já interpretado.
  app.use("/billing/webhook", billingWebhookRoutes);

  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/auth", authRoutes);
  app.use("/checkin", checkinRoutes);
  app.use("/sessions", sessionsRoutes);
  app.use("/admin/templates", templatesRoutes);
  app.use("/founder", founderRoutes);
  app.use("/account", accountRoutes);
  app.use("/legal", legalRoutes);
  app.use("/billing", billingRoutes);

  app.use(errorHandler);

  return app;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1]}`) {
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`CuidaMente backend a correr na porta ${env.port}`);
  });
}
