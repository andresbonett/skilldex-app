"use client";

import { useOptimistic, useState, useTransition } from "react";
import { SparklesIcon } from "lucide-react";

import { updateJobStatus } from "@/app/actions/dashboard";
import { ExternalCvPromptModal } from "@/components/cv/external-cv-prompt-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EstadoPostulacion } from "@/db/schema";
import { estadoPostulacionValues } from "@/db/schema";
import { KANBAN_COLUMNS, type KanbanColumn } from "@/lib/dashboard";

export type JobCard = {
  id: number;
  cargo: string;
  empresa: string;
  estadoPostulacion: EstadoPostulacion;
  urlOriginal: string | null;
  fechaCreacion: Date | null;
  perfilListo?: boolean;
};

function JobTicket({
  job,
  disabled,
  onStatusChange,
  onPrompt,
}: {
  job: JobCard;
  disabled: boolean;
  onStatusChange: (estado: EstadoPostulacion) => void;
  onPrompt: () => void;
}) {
  return (
    <article className="rounded-xl border border-border/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
      <h4 className="text-sm font-semibold leading-snug text-foreground">
        {job.cargo}
      </h4>
      <p className="mt-1 text-sm text-muted-foreground">{job.empresa}</p>
      {job.perfilListo ? (
        <Badge className="mt-2 bg-teal-700 text-white hover:bg-teal-700">
          ¡Perfil Listo! Contactar Empresa
        </Badge>
      ) : null}
      {job.urlOriginal ? (
        <a
          href={job.urlOriginal}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-teal-800 underline-offset-2 hover:underline"
        >
          Ver original
        </a>
      ) : null}
      <div className="mt-3 flex flex-col gap-2">
        <Select
          value={job.estadoPostulacion}
          disabled={disabled}
          onValueChange={(value) => {
            if (!value) return;
            if (
              !(estadoPostulacionValues as readonly string[]).includes(value)
            ) {
              return;
            }
            onStatusChange(value as EstadoPostulacion);
          }}
        >
          <SelectTrigger className="h-7 w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {estadoPostulacionValues.map((estado) => (
              <SelectItem key={estado} value={estado}>
                {estado}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          size="xs"
          variant="outline"
          className="w-full"
          onClick={onPrompt}
        >
          <SparklesIcon />
          Prompt CV externo
        </Button>
      </div>
    </article>
  );
}

export function KanbanBoard({ jobs }: { jobs: JobCard[] }) {
  const [isPending, startTransition] = useTransition();
  const [promptJob, setPromptJob] = useState<JobCard | null>(null);
  const [optimisticJobs, setOptimisticJobs] = useOptimistic(
    jobs,
    (current, update: { id: number; estadoPostulacion: EstadoPostulacion }) =>
      current.map((j) =>
        j.id === update.id
          ? { ...j, estadoPostulacion: update.estadoPostulacion }
          : j,
      ),
  );

  function handleStatus(jobId: number, estadoPostulacion: EstadoPostulacion) {
    startTransition(async () => {
      setOptimisticJobs({ id: jobId, estadoPostulacion });
      await updateJobStatus(jobId, estadoPostulacion);
    });
  }

  const rejected = optimisticJobs.filter(
    (j) => j.estadoPostulacion === "Rechazado",
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 md:grid-cols-3">
        {KANBAN_COLUMNS.map((column: KanbanColumn) => {
          const columnJobs = optimisticJobs.filter(
            (j) => j.estadoPostulacion === column,
          );

          return (
            <section
              key={column}
              className="rounded-2xl border border-border/60 bg-white/40 p-3 backdrop-blur-sm"
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-[family-name:var(--font-display)] text-base tracking-tight">
                  {column}
                </h3>
                <Badge variant="secondary">{columnJobs.length}</Badge>
              </div>
              <div className="flex flex-col gap-2.5">
                {columnJobs.length === 0 ? (
                  <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                    Sin vacantes
                  </p>
                ) : (
                  columnJobs.map((job) => (
                    <JobTicket
                      key={job.id}
                      job={job}
                      disabled={isPending}
                      onStatusChange={(estado) => handleStatus(job.id, estado)}
                      onPrompt={() => setPromptJob(job)}
                    />
                  ))
                )}
              </div>
            </section>
          );
        })}
      </div>

      {rejected.length > 0 ? (
        <section className="rounded-2xl border border-dashed border-border/80 bg-white/30 p-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Rechazado
            </h3>
            <Badge variant="outline">{rejected.length}</Badge>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {rejected.map((job) => (
              <JobTicket
                key={job.id}
                job={job}
                disabled={isPending}
                onStatusChange={(estado) => handleStatus(job.id, estado)}
                onPrompt={() => setPromptJob(job)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <ExternalCvPromptModal
        open={promptJob !== null}
        onOpenChange={(open) => {
          if (!open) setPromptJob(null);
        }}
        jobId={promptJob?.id}
        jobLabel={
          promptJob ? `${promptJob.cargo} — ${promptJob.empresa}` : undefined
        }
      />
    </div>
  );
}
