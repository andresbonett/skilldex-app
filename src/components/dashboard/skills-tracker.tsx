"use client";

import { useMemo, useOptimistic, useState, useTransition } from "react";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  LayoutGridIcon,
  TableIcon,
  Trash2Icon,
} from "lucide-react";

import {
  archiveSkill,
  deleteSkill,
  unarchiveSkill,
  updateSkillEstado,
  updateSkillNivel,
} from "@/app/actions/dashboard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  estadoHabilidadActivosValues,
  nivelDominioValues,
  type EstadoHabilidad,
  type NivelDominio,
} from "@/db/schema";
import {
  ESTADO_HABILIDAD_LABELS,
  NIVEL_DOMINIO_LABELS,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

export type SkillItem = {
  id: number;
  nombreHabilidad: string;
  tipo: string;
  estado: EstadoHabilidad;
  nivelDominio: NivelDominio;
  frecuencia: number;
};

type SkillUpdate =
  | { type: "patch"; id: number; field: "estado"; value: EstadoHabilidad }
  | { type: "patch"; id: number; field: "nivelDominio"; value: NivelDominio }
  | { type: "remove"; id: number };

type ViewMode = "table" | "cards";
type FilterEstado = "activas" | "todas" | EstadoHabilidad;

const ESTADO_FILTERS: { id: FilterEstado; label: string }[] = [
  { id: "activas", label: "Activas" },
  { id: "pendiente", label: "Pendientes" },
  { id: "en_progreso", label: "En progreso" },
  { id: "completada", label: "Completadas" },
  { id: "archivada", label: "Archivadas" },
  { id: "todas", label: "Todas" },
];

function estadoTone(estado: EstadoHabilidad) {
  switch (estado) {
    case "pendiente":
      return "border-amber-200/80 bg-amber-50 text-amber-900";
    case "en_progreso":
      return "border-sky-200/80 bg-sky-50 text-sky-900";
    case "completada":
      return "border-emerald-200/80 bg-emerald-50 text-emerald-900";
    case "archivada":
      return "border-stone-200/80 bg-stone-100 text-stone-600";
  }
}

function MiniSelect({
  value,
  disabled,
  options,
  labels,
  ariaLabel,
  onChange,
  triggerClassName,
}: {
  value: string;
  disabled: boolean;
  options: readonly string[];
  labels: Record<string, string>;
  ariaLabel: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onChange(next);
      }}
    >
      <SelectTrigger
        aria-label={ariaLabel}
        className={cn("h-7 w-full min-w-0 px-2 text-xs", triggerClassName)}
        size="sm"
      >
        <SelectValue>{labels[value] ?? value}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {labels[option] ?? option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function SkillActions({
  skill,
  disabled,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  skill: SkillItem;
  disabled: boolean;
  onArchive: () => void;
  onUnarchive: () => void;
  onDelete: () => void;
}) {
  const archived = skill.estado === "archivada";

  return (
    <div className="flex items-center justify-end gap-0.5">
      {archived ? (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={disabled}
          aria-label={`Restaurar ${skill.nombreHabilidad}`}
          title="Restaurar"
          onClick={onUnarchive}
        >
          <ArchiveRestoreIcon />
        </Button>
      ) : (
        <Button
          type="button"
          size="icon-xs"
          variant="ghost"
          disabled={disabled}
          aria-label={`Archivar ${skill.nombreHabilidad}`}
          title="Archivar (no quiero aprenderla)"
          onClick={onArchive}
        >
          <ArchiveIcon />
        </Button>
      )}
      <Button
        type="button"
        size="icon-xs"
        variant="ghost"
        disabled={disabled}
        aria-label={`Eliminar ${skill.nombreHabilidad}`}
        title="Eliminar definitivamente"
        className="text-destructive hover:text-destructive"
        onClick={onDelete}
      >
        <Trash2Icon />
      </Button>
    </div>
  );
}

export function SkillsTracker({ skills }: { skills: SkillItem[] }) {
  const [view, setView] = useState<ViewMode>("table");
  const [filter, setFilter] = useState<FilterEstado>("activas");
  const [isPending, startTransition] = useTransition();
  const [optimisticSkills, setOptimisticSkills] = useOptimistic(
    skills,
    (current, update: SkillUpdate) => {
      if (update.type === "remove") {
        return current.filter((s) => s.id !== update.id);
      }
      return current.map((s) => {
        if (s.id !== update.id) return s;
        if (update.field === "estado") {
          return { ...s, estado: update.value };
        }
        return { ...s, nivelDominio: update.value };
      });
    },
  );

  const filtered = useMemo(() => {
    let list = optimisticSkills;
    if (filter === "activas") {
      list = list.filter((s) => s.estado !== "archivada");
    } else if (filter !== "todas") {
      list = list.filter((s) => s.estado === filter);
    }

    return [...list].sort(
      (a, b) =>
        b.frecuencia - a.frecuencia ||
        a.nombreHabilidad.localeCompare(b.nombreHabilidad),
    );
  }, [optimisticSkills, filter]);

  const counts = useMemo(() => {
    return {
      activas: optimisticSkills.filter((s) => s.estado !== "archivada").length,
      todas: optimisticSkills.length,
      pendiente: optimisticSkills.filter((s) => s.estado === "pendiente").length,
      en_progreso: optimisticSkills.filter((s) => s.estado === "en_progreso")
        .length,
      completada: optimisticSkills.filter((s) => s.estado === "completada")
        .length,
      archivada: optimisticSkills.filter((s) => s.estado === "archivada").length,
    };
  }, [optimisticSkills]);

  function patchEstado(skillId: number, estado: EstadoHabilidad) {
    startTransition(async () => {
      setOptimisticSkills({
        type: "patch",
        id: skillId,
        field: "estado",
        value: estado,
      });
      await updateSkillEstado(skillId, estado);
    });
  }

  function patchNivel(skillId: number, nivelDominio: NivelDominio) {
    startTransition(async () => {
      setOptimisticSkills({
        type: "patch",
        id: skillId,
        field: "nivelDominio",
        value: nivelDominio,
      });
      await updateSkillNivel(skillId, nivelDominio);
    });
  }

  function handleArchive(skill: SkillItem) {
    startTransition(async () => {
      setOptimisticSkills({
        type: "patch",
        id: skill.id,
        field: "estado",
        value: "archivada",
      });
      await archiveSkill(skill.id);
    });
  }

  function handleUnarchive(skill: SkillItem) {
    startTransition(async () => {
      setOptimisticSkills({
        type: "patch",
        id: skill.id,
        field: "estado",
        value: "pendiente",
      });
      await unarchiveSkill(skill.id);
    });
  }

  function handleDelete(skill: SkillItem) {
    const ok = window.confirm(
      `¿Eliminar «${skill.nombreHabilidad}» de forma permanente? Esta acción no se puede deshacer.`,
    );
    if (!ok) return;

    startTransition(async () => {
      setOptimisticSkills({ type: "remove", id: skill.id });
      await deleteSkill(skill.id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {ESTADO_FILTERS.map((item) => (
            <Button
              key={item.id}
              type="button"
              size="xs"
              variant={filter === item.id ? "default" : "outline"}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
              <span className="text-[0.7rem] opacity-70">
                {counts[item.id]}
              </span>
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-1 self-start rounded-lg border border-border/70 bg-white/60 p-0.5">
          <Button
            type="button"
            size="icon-xs"
            variant={view === "table" ? "secondary" : "ghost"}
            aria-label="Vista tabla"
            onClick={() => setView("table")}
          >
            <TableIcon />
          </Button>
          <Button
            type="button"
            size="icon-xs"
            variant={view === "cards" ? "secondary" : "ghost"}
            aria-label="Vista cards"
            onClick={() => setView("cards")}
          >
            <LayoutGridIcon />
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No hay habilidades en este filtro.
        </p>
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-xl border border-border/70 bg-white/70">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="border-b border-border/70 bg-muted/40 text-[0.7rem] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2.5 py-2 font-medium">Habilidad</th>
                <th className="px-2.5 py-2 font-medium">Tipo</th>
                <th className="px-2.5 py-2 font-medium">Freq.</th>
                <th className="px-2.5 py-2 font-medium">Estado</th>
                <th className="px-2.5 py-2 font-medium">Nivel</th>
                <th className="px-2.5 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((skill) => (
                <tr
                  key={skill.id}
                  className={cn(
                    "border-b border-border/50 last:border-b-0 hover:bg-muted/20",
                    skill.estado === "archivada" && "opacity-70",
                  )}
                >
                  <td className="max-w-[220px] truncate px-2.5 py-1.5 text-sm font-medium text-foreground">
                    {skill.nombreHabilidad}
                  </td>
                  <td className="px-2.5 py-1.5 text-muted-foreground">
                    {skill.tipo}
                  </td>
                  <td className="px-2.5 py-1.5 tabular-nums text-muted-foreground">
                    {skill.frecuencia}×
                  </td>
                  <td className="px-2.5 py-1.5">
                    {skill.estado === "archivada" ? (
                      <Badge variant="secondary" className="font-normal">
                        Archivada
                      </Badge>
                    ) : (
                      <MiniSelect
                        value={skill.estado}
                        disabled={isPending}
                        options={estadoHabilidadActivosValues}
                        labels={ESTADO_HABILIDAD_LABELS}
                        ariaLabel={`Estado de ${skill.nombreHabilidad}`}
                        onChange={(v) =>
                          patchEstado(skill.id, v as EstadoHabilidad)
                        }
                      />
                    )}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <MiniSelect
                      value={skill.nivelDominio}
                      disabled={isPending || skill.estado === "archivada"}
                      options={nivelDominioValues}
                      labels={NIVEL_DOMINIO_LABELS}
                      ariaLabel={`Nivel de ${skill.nombreHabilidad}`}
                      onChange={(v) =>
                        patchNivel(skill.id, v as NivelDominio)
                      }
                    />
                  </td>
                  <td className="px-2.5 py-1.5">
                    <SkillActions
                      skill={skill}
                      disabled={isPending}
                      onArchive={() => handleArchive(skill)}
                      onUnarchive={() => handleUnarchive(skill)}
                      onDelete={() => handleDelete(skill)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((skill) => (
            <article
              key={skill.id}
              className={cn(
                "flex flex-col gap-1.5 rounded-lg border p-2 shadow-sm",
                estadoTone(skill.estado),
              )}
            >
              <div className="flex items-start justify-between gap-1">
                <p className="line-clamp-2 text-xs font-semibold leading-snug">
                  {skill.nombreHabilidad}
                </p>
                <SkillActions
                  skill={skill}
                  disabled={isPending}
                  onArchive={() => handleArchive(skill)}
                  onUnarchive={() => handleUnarchive(skill)}
                  onDelete={() => handleDelete(skill)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                <Badge
                  variant="outline"
                  className="h-5 border-current/20 bg-white/50 px-1.5 text-[0.65rem] font-normal"
                >
                  {skill.tipo}
                </Badge>
                <Badge
                  variant="outline"
                  className="h-5 border-current/20 bg-white/50 px-1.5 text-[0.65rem] font-normal"
                >
                  {skill.frecuencia}×
                </Badge>
              </div>
              {skill.estado === "archivada" ? (
                <Badge variant="secondary" className="w-fit font-normal">
                  Archivada
                </Badge>
              ) : (
                <MiniSelect
                  value={skill.estado}
                  disabled={isPending}
                  options={estadoHabilidadActivosValues}
                  labels={ESTADO_HABILIDAD_LABELS}
                  ariaLabel={`Estado de ${skill.nombreHabilidad}`}
                  onChange={(v) => patchEstado(skill.id, v as EstadoHabilidad)}
                  triggerClassName="bg-white/70"
                />
              )}
              <MiniSelect
                value={skill.nivelDominio}
                disabled={isPending || skill.estado === "archivada"}
                options={nivelDominioValues}
                labels={NIVEL_DOMINIO_LABELS}
                ariaLabel={`Nivel de ${skill.nombreHabilidad}`}
                onChange={(v) => patchNivel(skill.id, v as NivelDominio)}
                triggerClassName="bg-white/70"
              />
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
