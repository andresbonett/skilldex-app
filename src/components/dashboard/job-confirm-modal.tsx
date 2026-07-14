"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";

import type {
  JobExtractionDraft,
  ProcessJobHabilidad,
} from "@/app/actions/process-job";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TipoHabilidad } from "@/db/schema";
import {
  EXIGENCIA_HABILIDAD_LABELS,
  TIPO_HABILIDAD_LABELS,
} from "@/lib/dashboard";
import { cn } from "@/lib/utils";

const TIPO_ORDER: TipoHabilidad[] = ["tecnica", "blanda", "requisito"];

function skillKey(h: ProcessJobHabilidad) {
  return h.nombre.toLowerCase();
}

function tipoBadgeClass(tipo: TipoHabilidad) {
  switch (tipo) {
    case "tecnica":
      return "border-teal-300 bg-teal-50 text-teal-900 data-[selected=false]:opacity-40";
    case "blanda":
      return "border-sky-300 bg-sky-50 text-sky-900 data-[selected=false]:opacity-40";
    case "requisito":
      return "border-amber-300 bg-amber-50 text-amber-950 data-[selected=false]:opacity-40";
  }
}

type JobConfirmModalProps = {
  open: boolean;
  draft: JobExtractionDraft | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selected: ProcessJobHabilidad[]) => void;
};

export function JobConfirmModal({
  open,
  draft,
  isSaving,
  onOpenChange,
  onConfirm,
}: JobConfirmModalProps) {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!draft || !open) return;
    setSelectedKeys(new Set(draft.habilidades.map(skillKey)));
  }, [draft, open]);

  const grouped = useMemo(() => {
    if (!draft) return [];
    return TIPO_ORDER.map((tipo) => ({
      tipo,
      label: TIPO_HABILIDAD_LABELS[tipo],
      items: draft.habilidades.filter((h) => h.tipo === tipo),
    })).filter((g) => g.items.length > 0);
  }, [draft]);

  const selectedCount = selectedKeys.size;
  const existingSet = useMemo(
    () => new Set(draft?.existingSkillNames ?? []),
    [draft],
  );

  function toggle(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function selectAll() {
    if (!draft) return;
    setSelectedKeys(new Set(draft.habilidades.map(skillKey)));
  }

  function selectNewOnly() {
    if (!draft) return;
    setSelectedKeys(
      new Set(
        draft.habilidades
          .filter((h) => !existingSet.has(skillKey(h)))
          .map(skillKey),
      ),
    );
  }

  function handleConfirm() {
    if (!draft) return;
    const selected = draft.habilidades.filter((h) =>
      selectedKeys.has(skillKey(h)),
    );
    onConfirm(selected);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSaving) return;
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="max-h-[min(90vh,720px)] overflow-y-auto sm:max-w-xl"
        showCloseButton={!isSaving}
      >
        <DialogHeader>
          <DialogTitle>Confirmar vacante</DialogTitle>
          <DialogDescription>
            Revisa el cargo y desmarca habilidades que no quieras agregar
            (duplicadas o irrelevantes).
          </DialogDescription>
        </DialogHeader>

        {draft ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <p className="font-[family-name:var(--font-display)] text-lg leading-tight tracking-tight text-foreground">
                {draft.cargo}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {draft.empresa}
              </p>
              {draft.experienciaRequerida ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Experiencia: {draft.experienciaRequerida}
                </p>
              ) : null}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {selectedCount} de {draft.habilidades.length} seleccionadas
              </p>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={isSaving}
                onClick={selectAll}
              >
                Todas
              </Button>
              <Button
                type="button"
                size="xs"
                variant="outline"
                disabled={isSaving}
                onClick={selectNewOnly}
              >
                Solo nuevas
              </Button>
            </div>

            <div className="flex flex-col gap-4">
              {grouped.map((group) => (
                <section key={group.tipo} className="flex flex-col gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {group.items.map((h) => {
                      const key = skillKey(h);
                      const selected = selectedKeys.has(key);
                      const alreadyTracked = existingSet.has(key);

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={isSaving}
                          data-selected={selected}
                          aria-pressed={selected}
                          onClick={() => toggle(key)}
                          className={cn(
                            "inline-flex max-w-full flex-col items-start gap-0.5 rounded-xl border px-2.5 py-1.5 text-left transition-all",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                            tipoBadgeClass(h.tipo),
                            !selected && "line-through decoration-1",
                          )}
                          title={
                            selected
                              ? "Clic para deseleccionar"
                              : "Clic para volver a seleccionar"
                          }
                        >
                          <span className="text-xs font-semibold leading-snug">
                            {h.nombre}
                          </span>
                          <span className="flex flex-wrap gap-1">
                            <Badge
                              variant="outline"
                              className="h-4 border-current/20 bg-white/50 px-1 text-[0.6rem] font-normal"
                            >
                              {EXIGENCIA_HABILIDAD_LABELS[h.exigencia]}
                            </Badge>
                            {alreadyTracked ? (
                              <Badge
                                variant="secondary"
                                className="h-4 px-1 text-[0.6rem] font-normal"
                              >
                                Ya en tracker
                              </Badge>
                            ) : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={isSaving || selectedCount === 0}
            onClick={handleConfirm}
          >
            {isSaving ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : null}
            {isSaving ? "Guardando…" : `Confirmar (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
