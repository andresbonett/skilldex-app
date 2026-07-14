/**
 * Smoke test: extracción con tipo/exigencia + persistencia en SQLite.
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
- Liderazgo técnico y trabajo en equipo

Nice to have / Se valora especialmente:
- Drizzle ORM
- Vercel AI SDK
- Inglés B2
- Proactividad y autonomía
- Experiencia en sector fintech
`;

async function main() {
  console.log("→ Llamando processJob (provider=google)...");
  const result = await processJob({
    textoVacante: SAMPLE,
    urlOriginal: `https://example.com/jobs/acme-senior-fullstack-${Date.now()}`,
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
    model: result.model,
  });

  const blandas = result.habilidades.filter((h) => h.tipo === "blanda");
  const valoradas = result.habilidades.filter((h) => h.exigencia === "valorada");
  const requeridas = result.habilidades.filter(
    (h) => h.exigencia === "requerida",
  );
  const tecnicas = result.habilidades.filter((h) => h.tipo === "tecnica");

  if (blandas.length < 1) {
    console.error("✗ Esperaba al menos 1 habilidad blanda, got:", blandas);
    process.exit(1);
  }
  if (valoradas.length < 1) {
    console.error("✗ Esperaba al menos 1 habilidad valorada, got:", valoradas);
    process.exit(1);
  }
  if (requeridas.length < 1) {
    console.error("✗ Esperaba al menos 1 requerida, got:", requeridas);
    process.exit(1);
  }
  if (tecnicas.length < 1) {
    console.error("✗ Esperaba al menos 1 técnica, got:", tecnicas);
    process.exit(1);
  }
  if (
    result.habilidades.every(
      (h) => h.tipo === "tecnica" && h.exigencia === "requerida",
    )
  ) {
    console.error("✗ Todas las habilidades son tecnica+requerida (sin variedad)");
    process.exit(1);
  }

  console.log("✓ Clasificación OK", {
    blandas: blandas.length,
    valoradas: valoradas.length,
    requeridas: requeridas.length,
    tecnicas: tecnicas.length,
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

  const hasValoradaLink = links.some((l) => l.exigencia === "valorada");
  const hasScore = skills.some(
    (s) =>
      result.habilidades.some((h) => h.nombre === s.nombreHabilidad) &&
      s.scorePrioridad >= 1,
  );
  const hasBlandaPersisted = skills.some(
    (s) =>
      s.tipo === "blanda" &&
      result.habilidades.some((h) => h.nombre === s.nombreHabilidad),
  );

  if (!hasValoradaLink) {
    console.error("✗ Relaciones sin exigencia=valorada");
    process.exit(1);
  }
  if (!hasBlandaPersisted) {
    console.error("✗ No se persistió ninguna habilidad blanda");
    process.exit(1);
  }
  if (!hasScore) {
    console.error("✗ scorePrioridad no se guardó");
    process.exit(1);
  }

  console.log("✓ Persistencia OK", {
    jobGuardado: Boolean(job),
    relaciones: links.length,
    skillsTotalesUsuario: skills.length,
    exigencias: {
      requeridas: links.filter((l) => l.exigencia === "requerida").length,
      valoradas: links.filter((l) => l.exigencia === "valorada").length,
    },
  });
}

main().catch((err) => {
  console.error("✗ Error inesperado:", err);
  process.exit(1);
});
