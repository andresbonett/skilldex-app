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

export const jobs = sqliteTable("jobs", {
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
});

export const skillsTracker = sqliteTable(
  "skills_tracker",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    nombreHabilidad: text("nombre_habilidad").notNull(),
    tipo: text("tipo", { enum: tipoHabilidadValues }).notNull().default("tecnica"),
    completada: integer("completada", { mode: "boolean" })
      .notNull()
      .default(false),
    frecuencia: integer("frecuencia").notNull().default(1),
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
