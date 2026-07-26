import { z } from "zod";

export const templateContentSchema = z.object({
  induction: z.string().min(1),
  coreSuggestions: z.array(z.string().min(1)).min(1),
  anchorPhrases: z.array(z.string().min(1)).min(1),
  closing: z.string().min(1),
  personalizableOpening: z
    .string()
    .min(1)
    .refine(
      (value) => value.includes("{{nome}}"),
      "personalizableOpening tem de conter o placeholder {{nome}}",
    ),
  paceOptions: z.array(z.string().min(1)).min(1),
});

export type ValidatedTemplateContent = z.infer<typeof templateContentSchema>;
