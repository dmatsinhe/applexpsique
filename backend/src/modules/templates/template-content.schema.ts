import { z } from "zod";

export const templateSectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  body: z.string().min(1),
});

export const templateContentSchema = z.object({
  personalizableOpening: z
    .string()
    .min(1)
    .refine(
      (value) => value.includes("{{nome}}"),
      "personalizableOpening tem de conter o placeholder {{nome}}",
    ),
  sections: z.array(templateSectionSchema).min(1),
  anchorPhrases: z.array(z.string().min(1)).min(1),
  closing: z.string().min(1),
  paceOptions: z.array(z.string().min(1)).min(1),
});

export type ValidatedTemplateContent = z.infer<typeof templateContentSchema>;
