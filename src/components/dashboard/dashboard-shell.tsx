"use client";

import { useMemo, useState } from "react";

import { JobPasteForm } from "@/components/dashboard/job-paste-form";
import { KanbanBoard, type JobCard } from "@/components/dashboard/kanban-board";
import {
  SkillsTracker,
  type SkillItem,
} from "@/components/dashboard/skills-tracker";
import { cn } from "@/lib/utils";

type TabId =
  | "vacante"
  | "tecnicas"
  | "blandas"
  | "requisitos"
  | "postulaciones";

const TABS: { id: TabId; label: string; short: string }[] = [
  { id: "vacante", label: "Nueva vacante", short: "Vacante" },
  { id: "tecnicas", label: "Técnicas", short: "Técnicas" },
  { id: "blandas", label: "Blandas", short: "Blandas" },
  { id: "requisitos", label: "Requisitos", short: "Requisitos" },
  { id: "postulaciones", label: "Postulaciones", short: "Kanban" },
];

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white/55 p-5 shadow-sm backdrop-blur-md sm:p-6">
      <h2 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
        {title}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function DashboardShell({
  skills,
  jobs,
}: {
  skills: SkillItem[];
  jobs: JobCard[];
}) {
  const [tab, setTab] = useState<TabId>("vacante");

  const counts = useMemo(() => {
    const active = (tipo: string) =>
      skills.filter((s) => s.tipo === tipo && s.estado !== "archivada").length;
    return {
      tecnicas: active("tecnica"),
      blandas: active("blanda"),
      requisitos: active("requisito"),
      postulaciones: jobs.length,
    };
  }, [skills, jobs]);

  const tabCount = (id: TabId): number | null => {
    if (id === "tecnicas") return counts.tecnicas;
    if (id === "blandas") return counts.blandas;
    if (id === "requisitos") return counts.requisitos;
    if (id === "postulaciones") return counts.postulaciones;
    return null;
  };

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-border/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
          <div>
            <p className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-foreground sm:text-4xl">
              SkillDex
            </p>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Prioriza el estudio técnico; las blandas y requisitos van en
              pistas aparte. La URL de cada oferta es obligatoria para el
              seguimiento.
            </p>
          </div>

          <nav
            aria-label="Secciones del dashboard"
            className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-0.5"
          >
            {TABS.map((item) => {
              const count = tabCount(item.id);
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(item.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "bg-white/60 text-muted-foreground hover:bg-white hover:text-foreground",
                  )}
                >
                  <span className="sm:hidden">{item.short}</span>
                  <span className="hidden sm:inline">{item.label}</span>
                  {count !== null ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 text-[0.65rem] tabular-nums",
                        active
                          ? "bg-background/20 text-background"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === "vacante" ? (
          <Panel
            title="Nueva vacante"
            description="Pega el anuncio con su URL (obligatoria) para extraer y priorizar habilidades."
          >
            <JobPasteForm />
          </Panel>
        ) : null}

        {tab === "tecnicas" ? (
          <Panel
            title="Habilidades técnicas"
            description="Prioridad de estudio: stack y herramientas ordenadas por peso de mercado (requerida ×2, valorada ×1)."
          >
            <SkillsTracker
              skills={skills}
              tipos={["tecnica"]}
              emptyMessage="Aún no hay habilidades técnicas. Extrae una vacante para empezar a priorizar tu estudio."
            />
          </Panel>
        ) : null}

        {tab === "blandas" ? (
          <Panel
            title="Habilidades blandas"
            description="Se construyen con el tiempo y la práctica en equipo. No compiten con el plan de estudio técnico."
          >
            <SkillsTracker
              skills={skills}
              tipos={["blanda"]}
              showStudyPriority={false}
              emptyMessage="Todavía no hay soft skills extraídas de tus ofertas."
            />
          </Panel>
        ) : null}

        {tab === "requisitos" ? (
          <Panel
            title="Requisitos formales"
            description="Formación, años de experiencia, modalidad y condiciones de la oferta — seguimiento, no cola de estudio."
          >
            <SkillsTracker
              skills={skills}
              tipos={["requisito"]}
              showStudyPriority={false}
              emptyMessage="Sin requisitos formales registrados todavía."
            />
          </Panel>
        ) : null}

        {tab === "postulaciones" ? (
          <Panel
            title="Kanban de postulaciones"
            description="Organiza cada vacante por etapa del proceso. Cada tarjeta enlaza a la URL de seguimiento."
          >
            <KanbanBoard jobs={jobs} />
          </Panel>
        ) : null}
      </main>
    </>
  );
}
