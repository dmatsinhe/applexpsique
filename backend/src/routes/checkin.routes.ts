import { Router } from "express";
import { z } from "zod";
import { CheckInService } from "../modules/checkin/checkin.service.js";
import { CLINICAL_GOALS } from "../modules/templates/template.types.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireAdult } from "../middleware/requireAdult.js";
import { asyncRoute } from "../middleware/errorHandler.js";

const router = Router();
const checkInService = new CheckInService();

router.use(requireAuth, requireAdult);

const submitSchema = z.object({
  locale: z.string().default("pt-PT"),
  requestedGoal: z.enum(CLINICAL_GOALS),
  recentFeelingText: z.string().min(1),
  situationNote: z.string().optional(),
  energyLevel: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  additionalNote: z.string().optional(),
  contraindicationSelfReport: z.boolean().optional(),
});

router.post(
  "/",
  asyncRoute(async (req, res) => {
    const body = submitSchema.parse(req.body);
    const outcome = await checkInService.submit({ ...body, userId: req.userId! });
    res.status(201).json(outcome);
  }),
);

router.post(
  "/:id/continue",
  asyncRoute(async (req, res) => {
    const outcome = await checkInService.continueAfterAmbiguousAcknowledgement(req.params.id);
    res.status(200).json(outcome);
  }),
);

const clarifySchema = z.object({
  resolution: z.enum(["ESCALATE", "DOWNGRADE"]),
});

router.post(
  "/:id/clarify-crisis",
  asyncRoute(async (req, res) => {
    const { resolution } = clarifySchema.parse(req.body);
    const outcome = await checkInService.resolveCrisisClarification(req.params.id, resolution);
    res.status(200).json(outcome);
  }),
);

export default router;
