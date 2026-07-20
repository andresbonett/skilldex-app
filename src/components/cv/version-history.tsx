"use client";

import { useTransition } from "react";

import {
  restoreResumeVersion,
  type ResumeBundle,
  type ResumeVersionSummary,
} from "@/app/actions/resume";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const SOURCE_LABEL: Record<string, string> = {
  manual: "Manual",
  import: "Import",
  ai_review: "Revisión IA",
  ai_optimize: "Optimización",
  restore: "Restaurado",
  seed: "Seed",
};

export function VersionHistory({
  versions,
  currentVersionId,
  onRestored,
}: {
  versions: ResumeVersionSummary[];
  currentVersionId: number | null;
  onRestored: (resume: ResumeBundle) => void;
}) {
  const [pending, startTransition] = useTransition();

  function restore(id: number) {
    startTransition(async () => {
      const result = await restoreResumeVersion(id);
      if (result.success) onRestored(result.resume);
      else window.alert(result.error);
    });
  }

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Sin versiones todavía.</p>
    );
  }

  return (
    <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
      {versions.map((v) => {
        const isCurrent = v.id === currentVersionId;
        return (
          <li
            key={v.id}
            className="rounded-lg border border-border/60 bg-white/60 p-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium">{v.label}</p>
                <p className="text-[0.7rem] text-muted-foreground">
                  {v.createdAt
                    ? new Date(v.createdAt).toLocaleString("es-CO")
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Badge variant="outline">
                  {SOURCE_LABEL[v.source] ?? v.source}
                </Badge>
                {isCurrent ? <Badge>Actual</Badge> : null}
              </div>
            </div>
            {v.aiNotes ? (
              <p className="mt-1.5 line-clamp-3 whitespace-pre-wrap text-xs text-muted-foreground">
                {v.aiNotes}
              </p>
            ) : null}
            {!isCurrent ? (
              <Button
                type="button"
                size="xs"
                variant="outline"
                className="mt-2"
                disabled={pending}
                onClick={() => restore(v.id)}
              >
                Restaurar
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
