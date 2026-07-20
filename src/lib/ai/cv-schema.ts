import { z } from "zod";

import { cvDocumentSchema } from "@/lib/cv/schema";

export const cvReviewResultSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Puntuación global ATS / claridad del CV (0-100)"),
  issues: z
    .array(z.string())
    .describe("Problemas detectados (ATS, claridad, gaps, precisión)"),
  suggestions: z
    .array(z.string())
    .describe("Sugerencias accionables de mejora"),
  revisedCv: cvDocumentSchema
    .optional()
    .describe(
      "Perfil maestro revisado completo solo si hay mejoras concretas; omitir si no conviene cambiar",
    ),
});

export type CvReviewResult = z.infer<typeof cvReviewResultSchema>;

export const cvOptimizeResultSchema = z.object({
  notes: z
    .string()
    .describe(
      "Resumen de cómo se priorizaron skills de mercado y qué se enfatizó (respetando cvNotes.accuracy)",
    ),
  revisedCv: cvDocumentSchema.describe(
    "Perfil maestro optimizado para maximizar cobertura de skills de mercado sin inventar experiencia",
  ),
});

export type CvOptimizeResult = z.infer<typeof cvOptimizeResultSchema>;
