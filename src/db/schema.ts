import { relations } from "drizzle-orm";
import {
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

/** SQLite no tiene enums nativos; se tipan con text({ enum }). */
export const estadoPostulacionValues = [
  "Por postular",
  "Postulado",
  "Entrevista",
  "Rechazado",
] as const;

export type EstadoPostulacion = (typeof estadoPostulacionValues)[number];

export const tipoHabilidadValues = [
  "tecnica",
  "blanda",
  "requisito",
] as const;

export type TipoHabilidad = (typeof tipoHabilidadValues)[number];

export const estadoHabilidadValues = [
  "pendiente",
  "en_progreso",
  "completada",
  "archivada",
] as const;

export type EstadoHabilidad = (typeof estadoHabilidadValues)[number];

/** Estados editables en el flujo diario (archivar tiene acción aparte). */
export const estadoHabilidadActivosValues = [
  "pendiente",
  "en_progreso",
  "completada",
] as const;

export const nivelDominioValues = [
  "basico",
  "medio",
  "avanzado",
  "experto",
] as const;

export type NivelDominio = (typeof nivelDominioValues)[number];

/** Exigencia de la habilidad respecto a una oferta concreta. */
export const exigenciaHabilidadValues = ["requerida", "valorada"] as const;

export type ExigenciaHabilidad = (typeof exigenciaHabilidadValues)[number];

/** Peso al acumular prioridad de mercado por oferta. */
export const EXIGENCIA_SCORE_WEIGHT: Record<ExigenciaHabilidad, number> = {
  requerida: 2,
  valorada: 1,
};

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    cargo: text("cargo").notNull(),
    empresa: text("empresa").notNull(),
    urlOriginal: text("url_original"),
    textoVacante: text("texto_vacante").notNull(),
    estadoPostulacion: text("estado_postulacion", {
      enum: estadoPostulacionValues,
    })
      .notNull()
      .default("Por postular"),
    fechaCreacion: integer("fecha_creacion", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => [
    /** Evita vacantes duplicadas cuando hay URL (NULLs no colisionan en SQLite). */
    uniqueIndex("jobs_user_url_idx").on(table.userId, table.urlOriginal),
  ],
);

export const skillsTracker = sqliteTable(
  "skills_tracker",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    nombreHabilidad: text("nombre_habilidad").notNull(),
    tipo: text("tipo", { enum: tipoHabilidadValues }).notNull().default("tecnica"),
    estado: text("estado", { enum: estadoHabilidadValues })
      .notNull()
      .default("pendiente"),
    nivelDominio: text("nivel_dominio", { enum: nivelDominioValues })
      .notNull()
      .default("basico"),
    /** Cuántas ofertas mencionan esta habilidad. */
    frecuencia: integer("frecuencia").notNull().default(1),
    /** Prioridad ponderada: requerida +2, valorada +1 por oferta. */
    scorePrioridad: integer("score_prioridad").notNull().default(1),
  },
  (table) => [
    uniqueIndex("skills_tracker_user_nombre_idx").on(
      table.userId,
      table.nombreHabilidad,
    ),
  ],
);

export const jobSkillsRelation = sqliteTable(
  "job_skills_relation",
  {
    jobId: integer("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    skillId: integer("skill_id")
      .notNull()
      .references(() => skillsTracker.id, { onDelete: "cascade" }),
    exigencia: text("exigencia", { enum: exigenciaHabilidadValues })
      .notNull()
      .default("requerida"),
  },
  (table) => [primaryKey({ columns: [table.jobId, table.skillId] })],
);

export const userSettings = sqliteTable("user_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull().unique(),
  proveedorIAFavorito: text("proveedor_ia_favorito").notNull().default("google"),
  modeloIAFavorito: text("modelo_ia_favorito")
    .notNull()
    .default("gemini-3.5-flash"),
});

export const jobsRelations = relations(jobs, ({ many }) => ({
  skills: many(jobSkillsRelation),
}));

export const skillsTrackerRelations = relations(skillsTracker, ({ many }) => ({
  jobs: many(jobSkillsRelation),
}));

export const jobSkillsRelationRelations = relations(
  jobSkillsRelation,
  ({ one }) => ({
    job: one(jobs, {
      fields: [jobSkillsRelation.jobId],
      references: [jobs.id],
    }),
    skill: one(skillsTracker, {
      fields: [jobSkillsRelation.skillId],
      references: [skillsTracker.id],
    }),
  }),
);
