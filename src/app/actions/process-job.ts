"use server";

import { and, eq, sql } from "drizzle-orm";
import { generateObject } from "ai";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { jobSkillsRelation, jobs, skillsTracker } from "@/db/schema";
import {
  DEFAULT_MODELS,
  DEFAULT_PROVIDER,
  type AIProvider,
  getModel,
} from "@/lib/ai/models";
import { jobExtractionSchema } from "@/lib/ai/schema";
import { LOCAL_USER_ID } from "@/lib/constants";
import { normalizeJobUrl } from "@/lib/job-url";

export type ProcessJobInput = {
  textoVacante: string;
  urlOriginal?: string | null;
  provider?: AIProvider;
  model?: string;
};

export type ProcessJobResult =
  | {
      success: true;
      jobId: number;
      cargo: string;
      empresa: string;
      habilidades: string[];
      experienciaRequerida: string;
      requisitosClave: string[];
      provider: AIProvider;
      model: string;
    }
  | {
      success: false;
      error: string;
      code?: "DUPLICATE_URL" | "MISSING_URL";
      existingJobId?: number;
    };

function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

function uniqueSkills(skills: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of skills) {
    const name = normalizeSkillName(raw);
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(name);
  }

  return result;
}

/**
 * Extrae requisitos de una vacante con IA y los persiste en SQLite.
 * La URL es obligatoria para evitar duplicar la misma oferta e inflar frecuencias.
 */
export async function processJob(
  input: ProcessJobInput,
): Promise<ProcessJobResult> {
  const textoVacante = input.textoVacante?.trim();
  if (!textoVacante) {
    return { success: false, error: "El texto de la vacante es obligatorio." };
  }

  const urlOriginal = normalizeJobUrl(input.urlOriginal);
  if (!urlOriginal) {
    return {
      success: false,
      code: "MISSING_URL",
      error:
        "La URL de la oferta es obligatoria para evitar duplicados de la misma vacante.",
    };
  }

  const existingByUrl = await db.query.jobs.findFirst({
    where: and(
      eq(jobs.userId, LOCAL_USER_ID),
      eq(jobs.urlOriginal, urlOriginal),
    ),
  });

  if (existingByUrl) {
    return {
      success: false,
      code: "DUPLICATE_URL",
      existingJobId: existingByUrl.id,
      error: `Esta oferta ya está registrada: «${existingByUrl.cargo}» en ${existingByUrl.empresa}. No se volvió a contar.`,
    };
  }

  const provider = input.provider ?? DEFAULT_PROVIDER;
  const modelId = input.model?.trim() || DEFAULT_MODELS[provider];

  try {
    const model = getModel(provider, modelId);

    const { object } = await generateObject({
      model,
      schema: jobExtractionSchema,
      system:
        "Eres un asistente experto en reclutamiento. Extrae datos estructurados de vacantes de empleo. Responde solo con la información pedida por el esquema. Si un campo no aparece en el texto, usa un valor razonable corto (p. ej. empresa 'Desconocida') sin inventar habilidades.",
      prompt: `Analiza la siguiente vacante y extrae cargo, empresa, habilidades requeridas, experiencia y requisitos clave.\n\n---\n${textoVacante}\n---`,
    });

    const habilidades = uniqueSkills(object.habilidadesRequeridas);
    const requisitosClave = uniqueSkills(object.requisitosClave);

    const jobId = await db.transaction(async (tx) => {
      const [job] = await tx
        .insert(jobs)
        .values({
          userId: LOCAL_USER_ID,
          cargo: object.cargo.trim() || "Sin cargo",
          empresa: object.empresa.trim() || "Desconocida",
          urlOriginal,
          textoVacante,
          estadoPostulacion: "Por postular",
        })
        .returning({ id: jobs.id });

      if (!job) {
        throw new Error("No se pudo crear el registro de la vacante.");
      }

      for (const nombreHabilidad of habilidades) {
        const existing = await tx.query.skillsTracker.findFirst({
          where: and(
            eq(skillsTracker.userId, LOCAL_USER_ID),
            eq(skillsTracker.nombreHabilidad, nombreHabilidad),
          ),
        });

        let skillId: number;

        if (existing) {
          await tx
            .update(skillsTracker)
            .set({ frecuencia: sql`${skillsTracker.frecuencia} + 1` })
            .where(eq(skillsTracker.id, existing.id));
          skillId = existing.id;
        } else {
          const [created] = await tx
            .insert(skillsTracker)
            .values({
              userId: LOCAL_USER_ID,
              nombreHabilidad,
              tipo: "tecnica",
              estado: "pendiente",
              nivelDominio: "basico",
              frecuencia: 1,
            })
            .returning({ id: skillsTracker.id });

          if (!created) {
            throw new Error(`No se pudo crear la habilidad: ${nombreHabilidad}`);
          }
          skillId = created.id;
        }

        await tx
          .insert(jobSkillsRelation)
          .values({ jobId: job.id, skillId })
          .onConflictDoNothing();
      }

      return job.id;
    });

    revalidatePath("/");

    return {
      success: true,
      jobId,
      cargo: object.cargo.trim() || "Sin cargo",
      empresa: object.empresa.trim() || "Desconocida",
      habilidades,
      experienciaRequerida: object.experienciaRequerida,
      requisitosClave,
      provider,
      model: modelId,
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error desconocido al procesar la vacante.";
    console.error("[processJob]", message);

    if (/UNIQUE constraint failed.*url/i.test(message)) {
      return {
        success: false,
        code: "DUPLICATE_URL",
        error:
          "Esta URL de oferta ya está registrada. No se duplicó ni se incrementaron habilidades.",
      };
    }

    return { success: false, error: message };
  }
}
