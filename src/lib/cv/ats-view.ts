import {
  TECHNICAL_SKILL_KEYS,
  TECHNICAL_SKILL_LABELS,
  type CvDocument,
} from "@/lib/cv/schema";

export type AtsSkillGroup = {
  label: string;
  items: string[];
};

export type AtsExperience = {
  title: string;
  company: string;
  location: string;
  start: string;
  end: string;
  durationLabel: string;
  summary: string;
  bullets: string[];
};

export type AtsProject = {
  name: string;
  role: string;
  description: string;
  highlights: string[];
  technologies: string[];
};

export type AtsView = {
  basics: CvDocument["basics"];
  profile: string;
  skillGroups: AtsSkillGroup[];
  coreCompetencies: string[];
  experience: AtsExperience[];
  projects: AtsProject[];
  leadership: string[];
  education: {
    title: string;
    institution: string;
    detail: string;
  }[];
  languages: {
    name: string;
    level: string;
  }[];
};

/**
 * Proyecta el perfil maestro a una vista ATS de una columna
 * (sin acoplar preview/PDF al JSON enriquecido).
 */
export function toAtsView(doc: CvDocument): AtsView {
  const skillGroups: AtsSkillGroup[] = TECHNICAL_SKILL_KEYS.map((key) => ({
    label: TECHNICAL_SKILL_LABELS[key],
    items: doc.technicalSkills[key] ?? [],
  })).filter((g) => g.items.length > 0);

  const experience: AtsExperience[] = doc.experience.map((job) => ({
    title: job.title,
    company: job.company,
    location: job.location ?? "",
    start: job.start,
    end: job.end,
    durationLabel: job.durationLabel ?? "",
    summary: job.summary ?? "",
    bullets: job.responsibilities.length
      ? job.responsibilities
      : job.summary
        ? [job.summary]
        : [],
  }));

  const projects: AtsProject[] = doc.featuredProjects
    .filter((p) => !p.status?.toLowerCase().includes("requiere validación"))
    .map((p) => ({
      name: p.name,
      role: p.role ?? "",
      description: p.description ?? "",
      highlights: p.highlights ?? [],
      technologies: p.technologies ?? [],
    }));

  return {
    basics: doc.basics,
    profile: doc.summary,
    skillGroups,
    coreCompetencies: doc.coreCompetencies,
    experience,
    projects,
    leadership: doc.leadershipAndCollaboration,
    education: doc.education.map((e) => ({
      title: e.title,
      institution: e.institution,
      detail: [e.type, e.status, e.detail].filter(Boolean).join(" · "),
    })),
    languages: doc.languages.map((l) => ({
      name: l.name,
      level: [l.level, l.status].filter(Boolean).join(" — "),
    })),
  };
}
