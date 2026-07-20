"use server";

import { generateObject } from "ai";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  type ResumeVersionSource,
  jobSkillsRelation,
  jobs,
  resumeVersions,
  resumes,
  skillsTracker,
} from "@/db/schema";
import {
  type AIProvider,
  DEFAULT_MODELS,
  DEFAULT_PROVIDER,
  getModel,
} from "@/lib/ai/models";
import {
  cvOptimizeResultSchema,
  cvReviewResultSchema,
} from "@/lib/ai/cv-schema";
import { classifyProcessError } from "@/lib/ai/errors";
import { LOCAL_USER_ID } from "@/lib/constants";
import {
  buildCvSkillCorpus,
  computeJobMatch,
  type JobMatchResult,
} from "@/lib/cv/match";
import {
  type CvDocument,
  parseCvDocument,
  parseCvDocumentSafe,
  serializeCvDocument,
} from "@/lib/cv/schema";
import { ANDRES_CV_SEED } from "@/lib/cv/seed-andres";

export type ResumeVersionSummary = {
  id: number;
  label: string;
  source: ResumeVersionSource;
  aiNotes: string | null;
  createdAt: Date | null;
};

export type ResumeBundle = {
  id: number;
  title: string;
  data: CvDocument;
  currentVersionId: number | null;
  updatedAt: Date | null;
  versions: ResumeVersionSummary[];
};

export type ActionOk<T> = { success: true } & T;
export type ActionErr = {
  success: false;
  error: string;
  code?: string;
};

async function countVersions(resumeId: number): Promise<number> {
  const rows = await db.query.resumeVersions.findMany({
    where: eq(resumeVersions.resumeId, resumeId),
    columns: { id: true },
  });
  return rows.length;
}

async function insertVersionAndSetCurrent(input: {
  resumeId: number;
  data: CvDocument;
  source: ResumeVersionSource;
  label: string;
  aiNotes?: string | null;
}): Promise<number> {
  const dataJson = serializeCvDocument(input.data);
  const [version] = await db
    .insert(resumeVersions)
    .values({
      resumeId: input.resumeId,
      label: input.label,
      source: input.source,
      dataJson,
      aiNotes: input.aiNotes ?? null,
    })
    .returning({ id: resumeVersions.id });

  if (!version) {
    throw new Error("No se pudo crear la versión del CV.");
  }

  await db
    .update(resumes)
    .set({
      dataJson,
      currentVersionId: version.id,
      updatedAt: new Date(),
    })
    .where(eq(resumes.id, input.resumeId));

  return version.id;
}

function mapResumeRow(
  row: typeof resumes.$inferSelect,
  versions: (typeof resumeVersions.$inferSelect)[],
  data?: CvDocument,
): ResumeBundle {
  return {
    id: row.id,
    title: row.title,
    data: data ?? parseCvDocument(JSON.parse(row.dataJson)),
    currentVersionId: row.currentVersionId,
    updatedAt: row.updatedAt,
    versions: versions.map((v) => ({
      id: v.id,
      label: v.label,
      source: v.source,
      aiNotes: v.aiNotes,
      createdAt: v.createdAt,
    })),
  };
}

/**
 * Obtiene el CV del usuario local o lo crea con el seed de Andrés.
 * Si el JSON guardado es legacy (no parsea), migra al perfil enriquecido.
 */
export async function getOrCreateResume(): Promise<ResumeBundle> {
  const existing = await db.query.resumes.findFirst({
    where: eq(resumes.userId, LOCAL_USER_ID),
  });

  if (existing) {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(existing.dataJson);
    } catch {
      parsedJson = null;
    }
    const safe = parseCvDocumentSafe(parsedJson);
    const versions = await db.query.resumeVersions.findMany({
      where: eq(resumeVersions.resumeId, existing.id),
      orderBy: [desc(resumeVersions.createdAt)],
    });

    if (safe.success) {
      return mapResumeRow(existing, versions, safe.data);
    }

    const n = versions.length + 1;
    await insertVersionAndSetCurrent({
      resumeId: existing.id,
      data: ANDRES_CV_SEED,
      source: "seed",
      label: `v${n} — Migración perfil enriquecido`,
      aiNotes:
        "Migración automática desde esquema legacy al perfil JSON maestro.",
    });

    const refreshed = await db.query.resumes.findFirst({
      where: eq(resumes.id, existing.id),
    });
    const nextVersions = await db.query.resumeVersions.findMany({
      where: eq(resumeVersions.resumeId, existing.id),
      orderBy: [desc(resumeVersions.createdAt)],
    });
    if (!refreshed) {
      throw new Error("No se pudo migrar el CV.");
    }
    return mapResumeRow(refreshed, nextVersions, ANDRES_CV_SEED);
  }

  const dataJson = serializeCvDocument(ANDRES_CV_SEED);
  const [created] = await db
    .insert(resumes)
    .values({
      userId: LOCAL_USER_ID,
      title: "CV Andrés Bonett",
      dataJson,
      updatedAt: new Date(),
    })
    .returning();

  if (!created) {
    throw new Error("No se pudo crear el CV inicial.");
  }

  const versionId = await insertVersionAndSetCurrent({
    resumeId: created.id,
    data: ANDRES_CV_SEED,
    source: "seed",
    label: "v1 — Seed perfil enriquecido",
    aiNotes: "Perfil maestro Frontend de Andrés Felipe Bonett Maldonado.",
  });

  const refreshed = await db.query.resumes.findFirst({
    where: eq(resumes.id, created.id),
  });
  const versions = await db.query.resumeVersions.findMany({
    where: eq(resumeVersions.resumeId, created.id),
    orderBy: [desc(resumeVersions.createdAt)],
  });

  if (!refreshed) {
    throw new Error("CV creado pero no encontrado.");
  }

  void versionId;
  return mapResumeRow(refreshed, versions, ANDRES_CV_SEED);
}

export async function saveResume(
  data: unknown,
  label?: string,
): Promise<ActionOk<{ resume: ResumeBundle }> | ActionErr> {
  const parsed = parseCvDocumentSafe(data);
  if (!parsed.success) {
    return {
      success: false,
      error: "El CV no tiene un formato válido.",
      code: "INVALID_CV",
    };
  }

  try {
    const resume = await getOrCreateResume();
    const n = (await countVersions(resume.id)) + 1;
    await insertVersionAndSetCurrent({
      resumeId: resume.id,
      data: parsed.data,
      source: "manual",
      label: label?.trim() || `v${n} — Guardado manual`,
    });
    revalidatePath("/cv");
    revalidatePath("/");
    return { success: true, resume: await getOrCreateResume() };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}

export async function importResumeJson(
  rawJson: string,
): Promise<ActionOk<{ resume: ResumeBundle }> | ActionErr> {
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return {
      success: false,
      error: "El archivo no es JSON válido.",
      code: "INVALID_JSON",
    };
  }

  const parsed = parseCvDocumentSafe(parsedJson);
  if (!parsed.success) {
    return {
      success: false,
      error:
        "El JSON no coincide con el esquema del CV. No se sobrescribieron datos.",
      code: "INVALID_CV",
    };
  }

  try {
    const resume = await getOrCreateResume();
    const n = (await countVersions(resume.id)) + 1;
    await insertVersionAndSetCurrent({
      resumeId: resume.id,
      data: parsed.data,
      source: "import",
      label: `v${n} — Importación JSON`,
    });
    revalidatePath("/cv");
    revalidatePath("/");
    return { success: true, resume: await getOrCreateResume() };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}

export async function restoreResumeVersion(
  versionId: number,
): Promise<ActionOk<{ resume: ResumeBundle }> | ActionErr> {
  try {
    const resume = await getOrCreateResume();
    const version = await db.query.resumeVersions.findFirst({
      where: and(
        eq(resumeVersions.id, versionId),
        eq(resumeVersions.resumeId, resume.id),
      ),
    });
    if (!version) {
      return { success: false, error: "Versión no encontrada.", code: "NOT_FOUND" };
    }

    const data = parseCvDocument(JSON.parse(version.dataJson));
    const n = (await countVersions(resume.id)) + 1;
    await insertVersionAndSetCurrent({
      resumeId: resume.id,
      data,
      source: "restore",
      label: `v${n} — Restaurado desde ${version.label}`,
      aiNotes: `Restaurado desde versión #${version.id} (${version.label}).`,
    });
    revalidatePath("/cv");
    revalidatePath("/");
    return { success: true, resume: await getOrCreateResume() };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}

export async function getJobMatchRecommendations(): Promise<JobMatchResult[]> {
  const resume = await getOrCreateResume();
  const completedSkills = await db.query.skillsTracker.findMany({
    where: and(
      eq(skillsTracker.userId, LOCAL_USER_ID),
      eq(skillsTracker.estado, "completada"),
    ),
    columns: { nombreHabilidad: true },
  });

  const corpus = buildCvSkillCorpus(
    resume.data,
    completedSkills.map((s) => s.nombreHabilidad),
  );

  const userJobs = await db.query.jobs.findMany({
    where: and(
      eq(jobs.userId, LOCAL_USER_ID),
      ne(jobs.estadoPostulacion, "Rechazado"),
    ),
    orderBy: [desc(jobs.fechaCreacion)],
  });

  if (userJobs.length === 0) return [];

  const jobIds = userJobs.map((j) => j.id);
  const relations = await db
    .select({
      jobId: jobSkillsRelation.jobId,
      skillId: jobSkillsRelation.skillId,
      exigencia: jobSkillsRelation.exigencia,
      nombreHabilidad: skillsTracker.nombreHabilidad,
      estado: skillsTracker.estado,
    })
    .from(jobSkillsRelation)
    .innerJoin(skillsTracker, eq(jobSkillsRelation.skillId, skillsTracker.id))
    .where(inArray(jobSkillsRelation.jobId, jobIds));

  const byJob = new Map<number, typeof relations>();
  for (const rel of relations) {
    const list = byJob.get(rel.jobId) ?? [];
    list.push(rel);
    byJob.set(rel.jobId, list);
  }

  const results = userJobs.map((job) => {
    const skills = (byJob.get(job.id) ?? []).map((r) => ({
      nombreHabilidad: r.nombreHabilidad,
      exigencia: r.exigencia,
      estado: r.estado,
    }));
    return computeJobMatch({
      jobId: job.id,
      cargo: job.cargo,
      empresa: job.empresa,
      estadoPostulacion: job.estadoPostulacion,
      urlOriginal: job.urlOriginal,
      skills,
      corpus,
    });
  });

  return results.sort((a, b) => b.matchPercent - a.matchPercent);
}

/** Datos de perfil-listo por job para el Kanban. */
export async function getJobsPerfilListoMap(): Promise<
  Record<number, boolean>
> {
  const userJobs = await db.query.jobs.findMany({
    where: eq(jobs.userId, LOCAL_USER_ID),
    columns: { id: true },
  });
  if (userJobs.length === 0) return {};

  const jobIds = userJobs.map((j) => j.id);
  const relations = await db
    .select({
      jobId: jobSkillsRelation.jobId,
      estado: skillsTracker.estado,
    })
    .from(jobSkillsRelation)
    .innerJoin(skillsTracker, eq(jobSkillsRelation.skillId, skillsTracker.id))
    .where(inArray(jobSkillsRelation.jobId, jobIds));

  const byJob = new Map<number, string[]>();
  for (const rel of relations) {
    const list = byJob.get(rel.jobId) ?? [];
    list.push(rel.estado);
    byJob.set(rel.jobId, list);
  }

  const map: Record<number, boolean> = {};
  for (const job of userJobs) {
    const estados = byJob.get(job.id) ?? [];
    map[job.id] =
      estados.length > 0 && estados.every((e) => e === "completada");
  }
  return map;
}

export async function buildExternalCvPrompt(
  jobId?: number,
): Promise<ActionOk<{ prompt: string }> | ActionErr> {
  try {
    const resume = await getOrCreateResume();
    const skills = await db.query.skillsTracker.findMany({
      where: and(
        eq(skillsTracker.userId, LOCAL_USER_ID),
        ne(skillsTracker.estado, "archivada"),
      ),
      orderBy: [
        desc(skillsTracker.scorePrioridad),
        desc(skillsTracker.frecuencia),
        asc(skillsTracker.nombreHabilidad),
      ],
    });

    let jobBlock = "";
    if (jobId) {
      const job = await db.query.jobs.findFirst({
        where: and(eq(jobs.id, jobId), eq(jobs.userId, LOCAL_USER_ID)),
      });
      if (job) {
        jobBlock = `\n## Oferta objetivo\n- Cargo: ${job.cargo}\n- Empresa: ${job.empresa}\n- Texto:\n${job.textoVacante}\n`;
      }
    }

    const skillsBlock = skills
      .map(
        (s) =>
          `- ${s.nombreHabilidad} (${s.tipo}, ${s.estado}, ${s.nivelDominio}, prioridad ${s.scorePrioridad})`,
      )
      .join("\n");

    const prompt = `Eres un experto en CVs ATS y reclutamiento tech.
Usa el siguiente CV en JSON y mis habilidades del tracker para:
1) Revisar el CV con criterios ATS.
2) Sugerir mejoras concretas (sin inventar experiencia).
3) Si hay oferta objetivo, adaptar el tono y el énfasis a esa vacante.
4) Opcionalmente redactar una carta de presentación breve.

## CV (JSON)
${serializeCvDocument(resume.data)}

## Habilidades del tracker
${skillsBlock || "(sin habilidades)"}
${jobBlock}
Responde en español.`;

    return { success: true, prompt };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}

const REVIEW_SYSTEM = `Eres un revisor experto de CVs ATS para roles Frontend / React / Next.js.
El documento es un perfil maestro JSON enriquecido (basics, summary, technicalSkills por categoría, experience.responsibilities, featuredProjects, leadershipAndCollaboration, atsKeywords, cvNotes).
Evalúa claridad ATS, keywords, posicionamiento Frontend (no inflar Full Stack/DevOps), bullets cuantificables y gaps.
Si hay cvNotes.accuracy, respétalas estrictamente (p. ej. no presentar Azure/AWS/Docker/CI/CD/Node como expertise de infraestructura o backend avanzado).
Si propones revisedCv, mantén la verdad factual: no inventes empresas, fechas ni logros; conserva la forma del schema.
Responde solo con el esquema estructurado.`;

const OPTIMIZE_SYSTEM = `Eres un experto en CVs ATS. Optimiza el perfil maestro JSON para maximizar la cobertura de las habilidades de mercado más demandadas (lista priorizada), sin inventar experiencia.
Reglas:
- Trabaja sobre summary, coreCompetencies, technicalSkills (categorías), experience.responsibilities/technologies y atsKeywords.
- No inventes empresas, proyectos ni logros falsos.
- Puedes reordenar categorías/ítems, enriquecer el summary y reformular responsibilities existentes para destacar skills prioritarias ya respaldadas por la experiencia.
- Integra skills del tracker con estado completada o en_progreso cuando encajen de forma honesta.
- Respeta cvNotes.accuracy y careerPositioning (perfil primario Frontend; no titular como Full Stack Junior ni inflar DevOps).
- Mantén español y la misma estructura del documento.
Responde solo con el esquema estructurado.`;

function accuracyBlock(doc: CvDocument): string {
  const notes = doc.cvNotes?.accuracy ?? [];
  if (notes.length === 0) return "";
  return `\n## Reglas de precisión (obligatorias)\n${notes.map((n) => `- ${n}`).join("\n")}\n`;
}

export async function reviewResumeWithAI(input: {
  provider?: AIProvider;
  model?: string;
  data?: unknown;
}): Promise<
  | ActionOk<{
      score: number;
      issues: string[];
      suggestions: string[];
      resume: ResumeBundle;
      appliedRevision: boolean;
    }>
  | ActionErr
> {
  const provider = input.provider ?? DEFAULT_PROVIDER;
  const modelId = input.model?.trim() || DEFAULT_MODELS[provider];

  try {
    const resume = await getOrCreateResume();
    const current =
      input.data !== undefined
        ? parseCvDocumentSafe(input.data)
        : { success: true as const, data: resume.data };

    if (!current.success) {
      return {
        success: false,
        error: "El CV actual no es válido para revisar.",
        code: "INVALID_CV",
      };
    }

    const model = getModel(provider, modelId);
    const { object } = await generateObject({
      model,
      schema: cvReviewResultSchema,
      system: REVIEW_SYSTEM,
      prompt: `Revisa este perfil maestro CV (JSON) y sugiere mejoras ATS.
${accuracyBlock(current.data)}
${serializeCvDocument(current.data)}`,
    });

    let appliedRevision = false;
    if (object.revisedCv) {
      const n = (await countVersions(resume.id)) + 1;
      await insertVersionAndSetCurrent({
        resumeId: resume.id,
        data: object.revisedCv,
        source: "ai_review",
        label: `v${n} — Revisión IA`,
        aiNotes: [
          `Score: ${object.score}`,
          ...object.issues.map((i) => `Issue: ${i}`),
          ...object.suggestions.map((s) => `Sug: ${s}`),
        ].join("\n"),
      });
      appliedRevision = true;
      revalidatePath("/cv");
      revalidatePath("/");
    }

    return {
      success: true,
      score: object.score,
      issues: object.issues,
      suggestions: object.suggestions,
      resume: await getOrCreateResume(),
      appliedRevision,
    };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}

export async function optimizeResumeForMarketSkills(input: {
  provider?: AIProvider;
  model?: string;
  data?: unknown;
}): Promise<
  ActionOk<{ resume: ResumeBundle; notes: string }> | ActionErr
> {
  const provider = input.provider ?? DEFAULT_PROVIDER;
  const modelId = input.model?.trim() || DEFAULT_MODELS[provider];

  try {
    const resume = await getOrCreateResume();
    const current =
      input.data !== undefined
        ? parseCvDocumentSafe(input.data)
        : { success: true as const, data: resume.data };

    if (!current.success) {
      return {
        success: false,
        error: "El CV actual no es válido para optimizar.",
        code: "INVALID_CV",
      };
    }

    const marketSkills = await db.query.skillsTracker.findMany({
      where: and(
        eq(skillsTracker.userId, LOCAL_USER_ID),
        ne(skillsTracker.estado, "archivada"),
      ),
      orderBy: [
        desc(skillsTracker.scorePrioridad),
        desc(skillsTracker.frecuencia),
        asc(skillsTracker.nombreHabilidad),
      ],
      limit: 40,
    });

    const prioritized = [...marketSkills].sort((a, b) => {
      const rank = (estado: string) =>
        estado === "completada" ? 0 : estado === "en_progreso" ? 1 : 2;
      const d = rank(a.estado) - rank(b.estado);
      if (d !== 0) return d;
      return b.scorePrioridad - a.scorePrioridad;
    });

    const skillsBlock = prioritized
      .map(
        (s) =>
          `- ${s.nombreHabilidad} | tipo=${s.tipo} | estado=${s.estado} | nivel=${s.nivelDominio} | score=${s.scorePrioridad} | freq=${s.frecuencia}`,
      )
      .join("\n");

    const model = getModel(provider, modelId);
    const { object } = await generateObject({
      model,
      schema: cvOptimizeResultSchema,
      system: OPTIMIZE_SYSTEM,
      prompt: `Optimiza este perfil maestro para maximizar cobertura de las skills de mercado más prioritarias.
${accuracyBlock(current.data)}
## Skills de mercado (prioridad)
${skillsBlock || "(sin skills en tracker; mejora claridad ATS general)"}

## Perfil actual
${serializeCvDocument(current.data)}`,
    });

    const n = (await countVersions(resume.id)) + 1;
    await insertVersionAndSetCurrent({
      resumeId: resume.id,
      data: object.revisedCv,
      source: "ai_optimize",
      label: `v${n} — Optimización mercado`,
      aiNotes: object.notes,
    });

    revalidatePath("/cv");
    revalidatePath("/");

    return {
      success: true,
      notes: object.notes,
      resume: await getOrCreateResume(),
    };
  } catch (error) {
    const classified = classifyProcessError(error);
    return { success: false, error: classified.userMessage, code: classified.code };
  }
}
