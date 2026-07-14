"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  type EstadoHabilidad,
  type EstadoPostulacion,
  type NivelDominio,
  jobs,
  skillsTracker,
} from "@/db/schema";
import { LOCAL_USER_ID } from "@/lib/constants";

export async function getJobsForUser() {
  return db.query.jobs.findMany({
    where: eq(jobs.userId, LOCAL_USER_ID),
    orderBy: [desc(jobs.fechaCreacion)],
  });
}

export async function getSkillsForUser() {
  return db.query.skillsTracker.findMany({
    where: eq(skillsTracker.userId, LOCAL_USER_ID),
    orderBy: [
      desc(skillsTracker.scorePrioridad),
      desc(skillsTracker.frecuencia),
      asc(skillsTracker.nombreHabilidad),
    ],
  });
}

export async function updateSkillEstado(
  skillId: number,
  estado: EstadoHabilidad,
) {
  await db
    .update(skillsTracker)
    .set({ estado })
    .where(
      and(
        eq(skillsTracker.id, skillId),
        eq(skillsTracker.userId, LOCAL_USER_ID),
      ),
    );

  revalidatePath("/");
}

export async function updateSkillNivel(
  skillId: number,
  nivelDominio: NivelDominio,
) {
  await db
    .update(skillsTracker)
    .set({ nivelDominio })
    .where(
      and(
        eq(skillsTracker.id, skillId),
        eq(skillsTracker.userId, LOCAL_USER_ID),
      ),
    );

  revalidatePath("/");
}

export async function archiveSkill(skillId: number) {
  await updateSkillEstado(skillId, "archivada");
}

export async function unarchiveSkill(skillId: number) {
  await updateSkillEstado(skillId, "pendiente");
}

export async function deleteSkill(skillId: number) {
  await db
    .delete(skillsTracker)
    .where(
      and(
        eq(skillsTracker.id, skillId),
        eq(skillsTracker.userId, LOCAL_USER_ID),
      ),
    );

  revalidatePath("/");
}

export async function updateJobStatus(
  jobId: number,
  estadoPostulacion: EstadoPostulacion,
) {
  await db
    .update(jobs)
    .set({ estadoPostulacion })
    .where(and(eq(jobs.id, jobId), eq(jobs.userId, LOCAL_USER_ID)));

  revalidatePath("/");
}
