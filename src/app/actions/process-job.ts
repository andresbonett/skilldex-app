"use server";

import { and, eq, sql } from "drizzle-orm";
import { generateObject } from "ai";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  EXIGENCIA_SCORE_WEIGHT,
  type ExigenciaHabilidad,
  type TipoHabilidad,
  jobSkillsRelation,
  jobs,
  skillsTracker,
} from "@/db/schema";
import {
  DEFAULT_MODELS,
  DEFAULT_PROVIDER,
  type AIProvider,
  getModel,
} from "@/lib/ai/models";
import {
  type HabilidadExtraida,
  jobExtractionSchema,
} from "@/lib/ai/schema";
import { classifyProcessError } from "@/lib/ai/errors";
import { LOCAL_USER_ID } from "@/lib/constants";
import { isSameJobUrl, normalizeJobUrl } from "@/lib/job-url";
import { logSystem } from "@/lib/logger";

export type ProcessJobInput = {
  textoVacante: string;
  urlOriginal?: string | null;
  provider?: AIProvider;
  model?: string;
  /** Si true, reprocesa una vacante ya registrada sin crear duplicado en el kanban. */
  force?: boolean;
};

export type ProcessJobHabilidad = {
  nombre: string;
  tipo: TipoHabilidad;
  exigencia: ExigenciaHabilidad;
};

export type ProcessJobResult =
  | {
      success: true;
      jobId: number;
      cargo: string;
      empresa: string;
      habilidades: ProcessJobHabilidad[];
      experienciaRequerida: string;
      provider: AIProvider;
      model: string;
      /** True si se actualizó una oferta ya existente (force). */
      reprocessed?: boolean;
    }
  | {
      success: false;
      error: string;
      code?:
        | "DUPLICATE_URL"
        | "MISSING_URL"
        | "VALIDATION"
        | "AI_ERROR"
        | "SYSTEM_ERROR";
      errorKind?: "ai" | "system";
      errorCode?: string;
      /** Detalle técnico para depuración. */
      detail?: string;
      /** Id en logs/skilldex.log */
      logId?: string;
      existingJobId?: number;
      existingCargo?: string;
      existingEmpresa?: string;
      fieldErrors?: {
        url?: string;
        texto?: string;
      };
    };

const EXTRACTION_SYSTEM = `Eres un asistente experto en reclutamiento. Extrae datos estructurados de vacantes de empleo.

Reglas de extracción de habilidades:
1. Incluye técnicas, blandas y requisitos formales cuando el texto los nombre. No inventes habilidades.
2. Exigencia:
   - requerida: secciones Requisitos, Qué necesitamos, Conocimientos técnicos básicos/obligatorios, formación y años de experiencia obligatorios.
   - valorada: Se valora especialmente, Nice to have, deseable, plus.
3. Tipo:
   - tecnica: herramientas, lenguajes, frameworks, plataformas (React, Git, Chart.js, Jira, SQL…).
   - blanda: comunicación, liderazgo, proactividad, trabajo en equipo, resolución de problemas, adaptabilidad, orientación a resultados…
   - requisito: formación académica, años de experiencia, modalidad (remoto/híbrido), sector o condición formal.
4. Ignora la descripción de la empresa. De "Qué harás"/responsabilidades, solo extrae si implica una skill concreta (no tareas genéricas).
5. Normaliza nombres cortos (ej. "React", "TypeScript", "Scrum"). Si la misma skill aparece como requerida y valorada, quédate solo con requerida.
6. Incluye siempre las soft skills cuando el anuncio las menciona (en Requisitos o Se valora).`;

function normalizeSkillName(name: string): string {
  return name.trim().replace(/\s+/g, " ");
}

/** Deduplica por nombre; si hay conflicto de exigencia, gana requerida. */
function uniqueHabilidades(
  skills: HabilidadExtraida[],
): ProcessJobHabilidad[] {
  const byKey = new Map<string, ProcessJobHabilidad>();

  for (const raw of skills) {
    const nombre = normalizeSkillName(raw.nombre);
    if (!nombre) continue;

    const key = nombre.toLowerCase();
    const next: ProcessJobHabilidad = {
      nombre,
      tipo: raw.tipo,
      exigencia: raw.exigencia,
    };
    const prev = byKey.get(key);

    if (!prev) {
      byKey.set(key, next);
      continue;
    }

    const exigencia: ExigenciaHabilidad =
      prev.exigencia === "requerida" || next.exigencia === "requerida"
        ? "requerida"
        : "valorada";

    byKey.set(key, {
      nombre: prev.nombre,
      tipo: prev.tipo,
      exigencia,
    });
  }

  return [...byKey.values()];
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function upsertHabilidadesForJob(
  tx: Tx,
  jobId: number,
  habilidades: ProcessJobHabilidad[],
  options: { incrementExistingLinks: boolean },
) {
  for (const habilidad of habilidades) {
    const weight = EXIGENCIA_SCORE_WEIGHT[habilidad.exigencia];
    const existingSkill = await tx.query.skillsTracker.findFirst({
      where: and(
        eq(skillsTracker.userId, LOCAL_USER_ID),
        eq(skillsTracker.nombreHabilidad, habilidad.nombre),
      ),
    });

    let skillId: number;
    let alreadyLinked = false;

    if (existingSkill) {
      skillId = existingSkill.id;
      const link = await tx.query.jobSkillsRelation.findFirst({
        where: and(
          eq(jobSkillsRelation.jobId, jobId),
          eq(jobSkillsRelation.skillId, skillId),
        ),
      });
      alreadyLinked = Boolean(link);

      const shouldIncrement =
        !alreadyLinked || options.incrementExistingLinks;

      if (shouldIncrement) {
        await tx
          .update(skillsTracker)
          .set({
            frecuencia: sql`${skillsTracker.frecuencia} + 1`,
            scorePrioridad: sql`${skillsTracker.scorePrioridad} + ${weight}`,
          })
          .where(eq(skillsTracker.id, existingSkill.id));
      }

      if (alreadyLinked && habilidad.exigencia === "requerida") {
        await tx
          .update(jobSkillsRelation)
          .set({ exigencia: "requerida" })
          .where(
            and(
              eq(jobSkillsRelation.jobId, jobId),
              eq(jobSkillsRelation.skillId, skillId),
            ),
          );
      }
    } else {
      const [created] = await tx
        .insert(skillsTracker)
        .values({
          userId: LOCAL_USER_ID,
          nombreHabilidad: habilidad.nombre,
          tipo: habilidad.tipo,
          estado: "pendiente",
          nivelDominio: "basico",
          frecuencia: 1,
          scorePrioridad: weight,
        })
        .returning({ id: skillsTracker.id });

      if (!created) {
        throw new Error(`No se pudo crear la habilidad: ${habilidad.nombre}`);
      }
      skillId = created.id;
    }

    if (!alreadyLinked) {
      await tx
        .insert(jobSkillsRelation)
        .values({
          jobId,
          skillId,
          exigencia: habilidad.exigencia,
        })
        .onConflictDoNothing();
    }
  }
}

async function findExistingJobByUrl(urlOriginal: string) {
  const existingByUrl = await db.query.jobs.findFirst({
    where: and(
      eq(jobs.userId, LOCAL_USER_ID),
      eq(jobs.urlOriginal, urlOriginal),
    ),
    columns: {
      id: true,
      cargo: true,
      empresa: true,
      urlOriginal: true,
    },
  });

  if (existingByUrl) return existingByUrl;

  const userJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, LOCAL_USER_ID),
    columns: {
      id: true,
      cargo: true,
      empresa: true,
      urlOriginal: true,
    },
  });

  return (
    userJobs.find((j) => isSameJobUrl(j.urlOriginal, urlOriginal)) ?? undefined
  );
}

/**
 * Extrae requisitos de una vacante con IA y los persiste en SQLite.
 * La URL es obligatoria para evitar duplicar la misma oferta e inflar frecuencias.
 */
export async function processJob(
  input: ProcessJobInput,
): Promise<ProcessJobResult> {
  const textoVacante = input.textoVacante?.trim() ?? "";
  const rawUrl = input.urlOriginal?.trim() ?? "";
  const fieldErrors: { url?: string; texto?: string } = {};

  if (!rawUrl) {
    fieldErrors.url = "La URL es obligatoria para el seguimiento de la oferta.";
  }
  if (!textoVacante) {
    fieldErrors.texto = "Pega el texto de la vacante para poder extraerla.";
  }

  if (fieldErrors.url || fieldErrors.texto) {
    return {
      success: false,
      code: "VALIDATION",
      error: "Revisa los campos marcados del formulario.",
      fieldErrors,
    };
  }

  const urlOriginal = normalizeJobUrl(rawUrl);
  if (!urlOriginal) {
    return {
      success: false,
      code: "MISSING_URL",
      error: "La URL de la oferta no es válida.",
      fieldErrors: {
        url: "No se pudo interpretar la URL. Usa un enlace completo (https://…).",
      },
    };
  }

  const existingJob = await findExistingJobByUrl(urlOriginal);

  if (existingJob && !input.force) {
    return {
      success: false,
      code: "DUPLICATE_URL",
      existingJobId: existingJob.id,
      existingCargo: existingJob.cargo,
      existingEmpresa: existingJob.empresa,
      error: `Esta vacante ya está registrada: «${existingJob.cargo}» en ${existingJob.empresa}.`,
      fieldErrors: {
        url: "Esta URL corresponde a una oferta que ya tienes en el tablero.",
      },
    };
  }

  const provider = input.provider ?? DEFAULT_PROVIDER;
  const modelId = input.model?.trim() || DEFAULT_MODELS[provider];

  try {
    const model = getModel(provider, modelId);

    const { object } = await generateObject({
      model,
      schema: jobExtractionSchema,
      system: EXTRACTION_SYSTEM,
      prompt: `Analiza la siguiente vacante y extrae cargo, empresa, habilidades (con tipo y exigencia) y experiencia requerida.\n\n---\n${textoVacante}\n---`,
    });

    const habilidades = uniqueHabilidades(object.habilidades);
    const cargo = object.cargo.trim() || "Sin cargo";
    const empresa = object.empresa.trim() || "Desconocida";
    const reprocessed = Boolean(existingJob && input.force);

    const jobId = await db.transaction(async (tx) => {
      let id: number;

      if (existingJob && input.force) {
        await tx
          .update(jobs)
          .set({
            cargo,
            empresa,
            urlOriginal,
            textoVacante,
          })
          .where(eq(jobs.id, existingJob.id));
        id = existingJob.id;

        await upsertHabilidadesForJob(tx, id, habilidades, {
          incrementExistingLinks: false,
        });
      } else {
        const [job] = await tx
          .insert(jobs)
          .values({
            userId: LOCAL_USER_ID,
            cargo,
            empresa,
            urlOriginal,
            textoVacante,
            estadoPostulacion: "Por postular",
          })
          .returning({ id: jobs.id });

        if (!job) {
          throw new Error("No se pudo crear el registro de la vacante.");
        }
        id = job.id;

        await upsertHabilidadesForJob(tx, id, habilidades, {
          incrementExistingLinks: true,
        });
      }

      return id;
    });

    try {
      revalidatePath("/");
    } catch {
      // Fuera de un request Next.js (p. ej. scripts/smoke) no hay store de render.
    }

    return {
      success: true,
      jobId,
      cargo,
      empresa,
      habilidades,
      experienciaRequerida: object.experienciaRequerida,
      provider,
      model: modelId,
      reprocessed,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      /UNIQUE constraint failed.*url/i.test(error.message)
    ) {
      await logSystem("warn", "processJob", "Duplicado por constraint UNIQUE", {
        error,
        meta: { urlOriginal, provider, model: modelId },
      });
      return {
        success: false,
        code: "DUPLICATE_URL",
        error:
          "Esta URL de oferta ya está registrada. Puedes descartar o agregar de todos modos.",
        fieldErrors: {
          url: "Esta URL ya está asociada a otra vacante en tu tablero.",
        },
      };
    }

    const classified = classifyProcessError(error);
    const entry = await logSystem(
      "error",
      "processJob",
      classified.userMessage,
      {
        error,
        detail: classified.detail,
        meta: {
          provider,
          model: modelId,
          errorKind: classified.kind,
          errorCode: classified.code,
          urlOriginal,
          force: Boolean(input.force),
        },
      },
    );

    return {
      success: false,
      code: classified.kind === "ai" ? "AI_ERROR" : "SYSTEM_ERROR",
      errorKind: classified.kind,
      errorCode: classified.code,
      error: classified.userMessage,
      detail: classified.detail,
      logId: entry.id,
    };
  }
}
