import { getJobsForUser, getSkillsForUser } from "@/app/actions/dashboard";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

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

      <DashboardShell
        skills={skills.map((s) => ({
          id: s.id,
          nombreHabilidad: s.nombreHabilidad,
          tipo: s.tipo,
          estado: s.estado,
          nivelDominio: s.nivelDominio,
          frecuencia: s.frecuencia,
          scorePrioridad: s.scorePrioridad,
        }))}
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
  );
}
