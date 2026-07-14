import { getJobsForUser, getSkillsForUser } from "@/app/actions/dashboard";
import { JobPasteForm } from "@/components/dashboard/job-paste-form";
import { KanbanBoard } from "@/components/dashboard/kanban-board";
import { SkillsTracker } from "@/components/dashboard/skills-tracker";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [jobs, skills] = await Promise.all([
    getJobsForUser(),
    getSkillsForUser(),
  ]);

  return (
    <div className="relative isolate min-h-full flex-1 overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,oklch(0.92_0.04_185),transparent_55%),radial-gradient(900px_500px_at_90%_0%,oklch(0.93_0.03_145),transparent_50%),linear-gradient(180deg,oklch(0.985_0.01_180),oklch(0.97_0.01_160))]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(oklch(0.7_0.02_180/0.08)_1px,transparent_1px),linear-gradient(90deg,oklch(0.7_0.02_180/0.08)_1px,transparent_1px)] [background-size:28px_28px]"
      />

      <header className="border-b border-border/50 bg-white/40 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 py-8 sm:px-6">
          <div>
            <p className="font-[family-name:var(--font-display)] text-4xl tracking-tight text-foreground sm:text-5xl">
              SkillDex
            </p>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground sm:text-base">
              Extrae requisitos de vacantes con IA, prioriza lo que debes
              aprender y lleva el pulso de tus postulaciones.
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 py-8 sm:px-6 sm:py-10">
        <section className="rounded-3xl border border-border/60 bg-white/55 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
            Nueva vacante
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pega el anuncio y elige el modelo de IA para extraer cargo, empresa
            y habilidades.
          </p>
          <div className="mt-5">
            <JobPasteForm />
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-white/55 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
            Tablero de habilidades
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Estado de aprendizaje y nivel de dominio. Vista compacta en tabla o
            mini-cards.
          </p>
          <div className="mt-5">
            <SkillsTracker
              skills={skills.map((s) => ({
                id: s.id,
                nombreHabilidad: s.nombreHabilidad,
                tipo: s.tipo,
                estado: s.estado,
                nivelDominio: s.nivelDominio,
                frecuencia: s.frecuencia,
              }))}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-border/60 bg-white/55 p-5 shadow-sm backdrop-blur-md sm:p-6">
          <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
            Kanban de postulaciones
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organiza cada vacante por etapa del proceso.
          </p>
          <div className="mt-5">
            <KanbanBoard
              jobs={jobs.map((j) => ({
                id: j.id,
                cargo: j.cargo,
                empresa: j.empresa,
                estadoPostulacion: j.estadoPostulacion,
                urlOriginal: j.urlOriginal,
                fechaCreacion: j.fechaCreacion,
              }))}
            />
          </div>
        </section>
      </main>
    </div>
  );
}
