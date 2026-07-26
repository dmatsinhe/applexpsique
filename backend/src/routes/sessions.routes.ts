import { Router } from "express";
import { z } from "zod";
import { SessionService } from "../modules/sessions/session.service.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdult } from "../middleware/requireAdult.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const sessionService = new SessionService();

router.use(requireAuth, requireAdult);

const createSchema = z.object({
  templateVersionId: z.string().uuid(),
  personalization: z.object({
    name: z.string().min(1),
    situationNote: z.string().optional(),
    pace: z.string().min(1),
    emphasizedAnchorPhrases: z.array(z.string()).optional(),
  }),
});

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = createSchema.parse(req.body);
    const result = await sessionService.createFromMatchedTemplate({
      userId: req.userId!,
      templateVersionId: body.templateVersionId,
      personalization: body.personalization,
    });
    res.status(201).json(result);
  }),
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const session = await sessionService.get(req.params.id);
    if (session.userId !== req.userId) {
      res.status(404).json({ error: "Sessão não encontrada." });
      return;
    }
    res.json(session);
  }),
);

const resumeSchema = z.object({ positionSeconds: z.number().int().min(0) });

router.patch(
  "/:id/resume-position",
  asyncRoute(async (req, res) => {
    const { positionSeconds } = resumeSchema.parse(req.body);
    await sessionService.saveResumePosition(req.params.id, positionSeconds);
    res.status(204).send();
  }),
);

router.post(
  "/:id/complete",
  asyncRoute(async (req, res) => {
    await sessionService.complete(req.params.id);
    res.status(204).send();
  }),
);

router.post(
  "/:id/abandon",
  asyncRoute(async (req, res) => {
    await sessionService.abandon(req.params.id);
    res.status(204).send();
  }),
);

export default router;
