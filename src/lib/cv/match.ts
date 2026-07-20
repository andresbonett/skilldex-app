import {
  EXIGENCIA_SCORE_WEIGHT,
  type ExigenciaHabilidad,
} from "@/db/schema";
import {
  flattenTechnicalSkills,
  type CvDocument,
} from "@/lib/cv/schema";

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9+#.\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Corpus de texto del CV + skills completadas del tracker. */
export function buildCvSkillCorpus(
  cv: CvDocument,
  completedTrackerSkills: string[] = [],
): string {
  const parts: string[] = [
    cv.basics.headline,
    cv.summary,
    cv.careerFocus ?? "",
    ...cv.coreCompetencies,
    ...flattenTechnicalSkills(cv.technicalSkills),
    ...cv.experience.flatMap((e) => [
      e.title,
      e.company,
      e.summary ?? "",
      ...(e.responsibilities ?? []),
      ...(e.technologies ?? []),
      ...(e.technicalLeadership ?? []),
    ]),
    ...cv.featuredProjects.flatMap((p) => [
      p.name,
      p.description ?? "",
      ...(p.highlights ?? []),
      ...(p.technologies ?? []),
    ]),
    ...cv.leadershipAndCollaboration,
    ...cv.education.flatMap((e) => [
      e.title,
      e.institution,
      e.detail ?? "",
    ]),
    ...cv.atsKeywords,
    ...cv.softSkills,
    ...cv.methodologies,
    ...completedTrackerSkills,
  ];
  return normalizeToken(parts.join(" "));
}

export function skillCoveredInCorpus(
  skillName: string,
  corpus: string,
): boolean {
  const normalized = normalizeToken(skillName);
  if (!normalized) return false;
  if (corpus.includes(normalized)) return true;

  const tokens = normalized.split(" ").filter((t) => t.length >= 3);
  if (tokens.length === 0) return false;
  return tokens.every((t) => corpus.includes(t));
}

export type JobSkillForMatch = {
  nombreHabilidad: string;
  exigencia: ExigenciaHabilidad;
  estado?: string;
};

export type JobMatchResult = {
  jobId: number;
  cargo: string;
  empresa: string;
  estadoPostulacion: string;
  urlOriginal: string | null;
  matchPercent: number;
  covered: string[];
  missing: string[];
  weightedCovered: number;
  weightedRequired: number;
  perfilListo: boolean;
};

export function computeJobMatch(input: {
  jobId: number;
  cargo: string;
  empresa: string;
  estadoPostulacion: string;
  urlOriginal: string | null;
  skills: JobSkillForMatch[];
  corpus: string;
}): JobMatchResult {
  let weightedCovered = 0;
  let weightedRequired = 0;
  const covered: string[] = [];
  const missing: string[] = [];

  for (const skill of input.skills) {
    const weight = EXIGENCIA_SCORE_WEIGHT[skill.exigencia] ?? 1;
    weightedRequired += weight;
    if (skillCoveredInCorpus(skill.nombreHabilidad, input.corpus)) {
      weightedCovered += weight;
      covered.push(skill.nombreHabilidad);
    } else {
      missing.push(skill.nombreHabilidad);
    }
  }

  const matchPercent =
    weightedRequired === 0
      ? 0
      : Math.round((weightedCovered / weightedRequired) * 100);

  const perfilListo =
    input.skills.length > 0 &&
    input.skills.every((s) => s.estado === "completada");

  return {
    jobId: input.jobId,
    cargo: input.cargo,
    empresa: input.empresa,
    estadoPostulacion: input.estadoPostulacion,
    urlOriginal: input.urlOriginal,
    matchPercent,
    covered,
    missing,
    weightedCovered,
    weightedRequired,
    perfilListo,
  };
}
