import { z } from "zod";

/** Esquema estricto para extracción estructurada de vacantes. */
export const jobExtractionSchema = z.object({
  cargo: z.string().describe("Título o cargo del puesto"),
  empresa: z.string().describe("Nombre de la empresa"),
  habilidadesRequeridas: z
    .array(z.string())
    .describe("Lista de habilidades técnicas o blandas requeridas"),
  experienciaRequerida: z
    .string()
    .describe("Experiencia requerida resumida en un texto"),
  requisitosClave: z
    .array(z.string())
    .describe("Otros requisitos clave (idiomas, disponibilidad, etc.)"),
});

export type JobExtraction = z.infer<typeof jobExtractionSchema>;
