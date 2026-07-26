import { Router } from "express";
import { z } from "zod";
import { TemplateService } from "../modules/templates/template.service.js";
import { templateContentSchema } from "../modules/templates/template-content.schema.js";
import { CLINICAL_GOALS } from "../modules/templates/template.types.js";
import { requireAdminKey } from "../middleware/requireAdminKey.js";
import { asyncRoute } from "../middleware/errorHandler.js";

/**
 * Endpoints administrativos do repositório de templates (secção 1). Nunca
 * geram conteúdo — só armazenam, versionam e aprovam texto já escrito por
 * um humano com autoridade clínica. Ver docs/architecture.md.
 */
const router = Router();
const templateService = new TemplateService();

router.use(requireAdminKey);

const draftSchema = z.object({
  slug: z.string().min(1),
  clinicalGoal: z.enum(CLINICAL_GOALS),
  title: z.string().min(1),
  content: templateContentSchema,
});

router.post(
  "/draft",
  asyncRoute(async (req, res) => {
    const body = draftSchema.parse(req.body);
    const result = await templateService.submitDraft(body);
    res.status(201).json(result);
  }),
);

const approveSchema = z.object({ approvedBy: z.string().min(1) });

router.post(
  "/:versionId/approve",
  asyncRoute(async (req, res) => {
    const { approvedBy } = approveSchema.parse(req.body);
    await templateService.approve(req.params.versionId, approvedBy);
    res.status(204).send();
  }),
);

export default router;
