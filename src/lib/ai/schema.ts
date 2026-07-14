import { z } from "zod";

/** Clasificación de naturaleza de la habilidad. */
export const habilidadTipoSchema = z
  .enum(["tecnica", "blanda", "requisito"])
  .describe(
    "tecnica: herramientas/lenguajes/frameworks; blanda: soft skills; requisito: formación, años, modalidad, sector",
  );

/** Exigencia de la habilidad en esa oferta concreta. */
export const habilidadExigenciaSchema = z
  .enum(["requerida", "valorada"])
  .describe(
    "requerida: Requisitos / conocimientos obligatorios; valorada: Se valora / Nice to have",
  );

export const habilidadExtraidaSchema = z.object({
  nombre: z
    .string()
    .describe("Nombre corto y normalizado de la habilidad o requisito"),
  tipo: habilidadTipoSchema,
  exigencia: habilidadExigenciaSchema,
});

/** Esquema estricto para extracción estructurada de vacantes. */
export const jobExtractionSchema = z.object({
  cargo: z.string().describe("Título o cargo del puesto"),
  empresa: z.string().describe("Nombre de la empresa"),
  habilidades: z
    .array(habilidadExtraidaSchema)
    .describe(
      "Habilidades y requisitos extraídos: técnicas, blandas y formales, con exigencia requerida o valorada",
    ),
  experienciaRequerida: z
    .string()
    .describe("Experiencia requerida resumida en un texto"),
});

export type HabilidadExtraida = z.infer<typeof habilidadExtraidaSchema>;
export type JobExtraction = z.infer<typeof jobExtractionSchema>;
