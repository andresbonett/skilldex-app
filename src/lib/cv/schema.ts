import { z } from "zod";

export const cvLinksSchema = z.object({
  linkedin: z.string().optional().default(""),
  github: z.string().optional().default(""),
  portfolio: z.string().optional().default(""),
});

export const cvBasicsSchema = z.object({
  fullName: z.string().min(1),
  headline: z.string().min(1),
  location: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().min(1),
  availability: z.string().optional().default(""),
  links: cvLinksSchema,
});

export const TECHNICAL_SKILL_KEYS = [
  "languages",
  "frontend",
  "stateManagement",
  "mobile",
  "backend",
  "cms",
  "testing",
  "cloud",
  "devopsAndInfrastructure",
  "versionControl",
  "tools",
  "aiAndDeveloperProductivity",
  "databasesKnowledge",
] as const;

export type TechnicalSkillKey = (typeof TECHNICAL_SKILL_KEYS)[number];

export const TECHNICAL_SKILL_LABELS: Record<TechnicalSkillKey, string> = {
  languages: "Lenguajes",
  frontend: "Frontend",
  stateManagement: "State Management",
  mobile: "Mobile",
  backend: "Backend",
  cms: "CMS",
  testing: "Testing",
  cloud: "Cloud",
  devopsAndInfrastructure: "DevOps e infraestructura",
  versionControl: "Control de versiones",
  tools: "Herramientas",
  aiAndDeveloperProductivity: "IA y productividad",
  databasesKnowledge: "Bases de datos",
};

const stringList = z.array(z.string());

export const cvTechnicalSkillsSchema = z.object({
  languages: stringList.default([]),
  frontend: stringList.default([]),
  stateManagement: stringList.default([]),
  mobile: stringList.default([]),
  backend: stringList.default([]),
  cms: stringList.default([]),
  testing: stringList.default([]),
  cloud: stringList.default([]),
  devopsAndInfrastructure: stringList.default([]),
  versionControl: stringList.default([]),
  tools: stringList.default([]),
  aiAndDeveloperProductivity: stringList.default([]),
  databasesKnowledge: stringList.default([]),
});

export const cvExperienceSchema = z.object({
  title: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional().default(""),
  start: z.string().min(1),
  end: z.string().min(1),
  durationLabel: z.string().optional().default(""),
  employmentType: z.string().optional().default(""),
  summary: z.string().optional().default(""),
  responsibilities: z.array(z.string()).default([]),
  technicalLeadership: z.array(z.string()).optional().default([]),
  technologies: z.array(z.string()).optional().default([]),
});

export const cvFeaturedProjectSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional().default(""),
  description: z.string().optional().default(""),
  highlights: z.array(z.string()).default([]),
  technologies: z.array(z.string()).default([]),
  status: z.string().optional().default(""),
});

export const cvEducationSchema = z.object({
  title: z.string().min(1),
  institution: z.string().min(1),
  type: z.string().optional().default(""),
  status: z.string().optional().default(""),
  detail: z.string().optional().default(""),
});

export const cvLanguageSchema = z.object({
  name: z.string().min(1),
  level: z.string().min(1),
  status: z.string().optional().default(""),
});

export const cvInfraLevelSchema = z.object({
  level: z.string(),
  description: z.string(),
  implementationLevel: z.string().optional().default(""),
});

export const cvCloudAndInfraSchema = z.object({
  azure: cvInfraLevelSchema.optional(),
  aws: cvInfraLevelSchema.optional(),
  docker: cvInfraLevelSchema.optional(),
  ciCd: cvInfraLevelSchema.optional(),
  githubActions: cvInfraLevelSchema.optional(),
  nginx: cvInfraLevelSchema.optional(),
});

export const cvAiProductivitySchema = z.object({
  primaryTools: z.array(z.string()).default([]),
  secondaryExperience: z.array(z.string()).default([]),
  description: z.string().optional().default(""),
  usageAreas: z.array(z.string()).default([]),
});

export const cvDesignCollabSchema = z.object({
  tools: z.array(z.string()).default([]),
  activities: z.array(z.string()).default([]),
});

export const cvDatabasesBackendSchema = z.object({
  professionalExperience: z.string().optional().default(""),
  backendExperience: z.array(z.string()).default([]),
  academicAndSelfLearning: z.array(z.string()).default([]),
});

export const cvCareerPositioningSchema = z.object({
  primary: z.string().optional().default(""),
  targetRoles: z.array(z.string()).default([]),
  secondary: z.array(z.string()).default([]),
  recommendedHeadline: z.string().optional().default(""),
});

export const cvNotesSchema = z.object({
  positioning: z.string().optional().default(""),
  accuracy: z.array(z.string()).default([]),
  missingDataToValidateBeforeFinalCV: z.array(z.string()).default([]),
});

/** Documento canónico del perfil maestro (editor, import/export, IA, preview/PDF). */
export const cvDocumentSchema = z.object({
  basics: cvBasicsSchema,
  summary: z.string().min(1),
  careerFocus: z.string().optional().default(""),
  yearsOfExperience: z.number().optional().default(0),
  coreCompetencies: z.array(z.string()).default([]),
  technicalSkills: cvTechnicalSkillsSchema.default({
    languages: [],
    frontend: [],
    stateManagement: [],
    mobile: [],
    backend: [],
    cms: [],
    testing: [],
    cloud: [],
    devopsAndInfrastructure: [],
    versionControl: [],
    tools: [],
    aiAndDeveloperProductivity: [],
    databasesKnowledge: [],
  }),
  experience: z.array(cvExperienceSchema).min(1),
  featuredProjects: z.array(cvFeaturedProjectSchema).default([]),
  leadershipAndCollaboration: z.array(z.string()).default([]),
  cloudAndInfrastructureExperience: cvCloudAndInfraSchema.optional().default({}),
  aiAndDeveloperProductivity: cvAiProductivitySchema.optional().default({
    primaryTools: [],
    secondaryExperience: [],
    description: "",
    usageAreas: [],
  }),
  designAndProductCollaboration: cvDesignCollabSchema.optional().default({
    tools: [],
    activities: [],
  }),
  databasesAndBackendLearning: cvDatabasesBackendSchema.optional().default({
    professionalExperience: "",
    backendExperience: [],
    academicAndSelfLearning: [],
  }),
  education: z.array(cvEducationSchema).min(1),
  languages: z.array(cvLanguageSchema).min(1),
  methodologies: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  careerPositioning: cvCareerPositioningSchema.optional().default({
    primary: "",
    targetRoles: [],
    secondary: [],
    recommendedHeadline: "",
  }),
  atsKeywords: z.array(z.string()).default([]),
  cvNotes: cvNotesSchema.optional().default({
    positioning: "",
    accuracy: [],
    missingDataToValidateBeforeFinalCV: [],
  }),
});

export type CvDocument = z.infer<typeof cvDocumentSchema>;
export type CvBasics = z.infer<typeof cvBasicsSchema>;
export type CvTechnicalSkills = z.infer<typeof cvTechnicalSkillsSchema>;
export type CvExperience = z.infer<typeof cvExperienceSchema>;
export type CvFeaturedProject = z.infer<typeof cvFeaturedProjectSchema>;
export type CvEducation = z.infer<typeof cvEducationSchema>;
export type CvLanguage = z.infer<typeof cvLanguageSchema>;

export function parseCvDocument(raw: unknown): CvDocument {
  return cvDocumentSchema.parse(raw);
}

export function parseCvDocumentSafe(raw: unknown) {
  return cvDocumentSchema.safeParse(raw);
}

export function serializeCvDocument(doc: CvDocument): string {
  return JSON.stringify(doc, null, 2);
}

/** Flatten all technical skill strings for matching / search. */
export function flattenTechnicalSkills(skills: CvTechnicalSkills): string[] {
  return TECHNICAL_SKILL_KEYS.flatMap((key) => skills[key] ?? []);
}
