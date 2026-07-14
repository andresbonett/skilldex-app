/**
 * Smoke test Fase 2: extracción con Gemini + persistencia en SQLite.
 * Uso: npx tsx --env-file=.env.local scripts/smoke-process-job.ts
 */
import { eq } from "drizzle-orm";

import { processJob } from "../src/app/actions/process-job";
import { db } from "../src/db";
import { jobSkillsRelation, jobs, skillsTracker } from "../src/db/schema";
import { LOCAL_USER_ID } from "../src/lib/constants";

const SAMPLE = `
Senior Full Stack Engineer — Acme Labs (Remoto LATAM)

Buscamos un ingeniero con experiencia en Next.js, TypeScript y PostgreSQL.
Requisitos:
- 4+ años de desarrollo web
- React y Next.js App Router
- Tipado fuerte con TypeScript
- Experiencia con APIs REST y diseño de esquemas SQL
- Comunicación clara en equipo ágil (scrum)

Nice to have: Drizzle ORM, Vercel AI SDK, inglés B2.
`;

async function main() {
  console.log("→ Llamando processJob (provider=google)...");
  const result = await processJob({
    textoVacante: SAMPLE,
    provider: "google",
  });

  if (!result.success) {
    console.error("✗ Falló:", result.error);
    process.exit(1);
  }

  console.log("✓ Extracción OK");
  console.log({
    jobId: result.jobId,
    cargo: result.cargo,
    empresa: result.empresa,
    habilidades: result.habilidades,
    experienciaRequerida: result.experienciaRequerida,
    requisitosClave: result.requisitosClave,
    model: result.model,
  });

  const job = await db.query.jobs.findFirst({
    where: eq(jobs.id, result.jobId),
  });
  const links = await db.query.jobSkillsRelation.findMany({
    where: eq(jobSkillsRelation.jobId, result.jobId),
  });
  const skills = await db.query.skillsTracker.findMany({
    where: eq(skillsTracker.userId, LOCAL_USER_ID),
  });

  console.log("✓ Persistencia OK", {
    jobGuardado: Boolean(job),
    relaciones: links.length,
    skillsTotalesUsuario: skills.length,
  });
}

main().catch((err) => {
  console.error("✗ Error inesperado:", err);
  process.exit(1);
});
