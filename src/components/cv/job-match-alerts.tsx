"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { JobMatchResult } from "@/lib/cv/match";

export function JobMatchAlerts({ matches }: { matches: JobMatchResult[] }) {
  if (matches.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay ofertas activas para comparar. Extrae vacantes en el
        dashboard y vuelve aquí para ver a cuáles conviene enviar tu CV.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {matches.map((m) => (
        <li
          key={m.jobId}
          className="rounded-xl border border-border/70 bg-white/70 p-3 shadow-sm"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-foreground">{m.cargo}</p>
              <p className="text-xs text-muted-foreground">{m.empresa}</p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge
                variant={m.matchPercent >= 70 ? "default" : "secondary"}
              >
                {m.matchPercent}% match
              </Badge>
              {m.perfilListo ? (
                <Badge className="bg-teal-700 text-white hover:bg-teal-700">
                  Perfil Listo
                </Badge>
              ) : null}
              <Badge variant="outline">{m.estadoPostulacion}</Badge>
            </div>
          </div>

          {m.missing.length > 0 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Faltan: {m.missing.slice(0, 6).join(", ")}
              {m.missing.length > 6 ? ` (+${m.missing.length - 6})` : ""}
            </p>
          ) : (
            <p className="mt-2 text-xs text-teal-800">
              Cubres todas las skills vinculadas a esta oferta.
            </p>
          )}

          <div className="mt-2 flex flex-wrap gap-3 text-xs">
            <Link
              href="/?tab=postulaciones"
              className="text-teal-800 underline-offset-2 hover:underline"
            >
              Ver en Kanban
            </Link>
            {m.urlOriginal ? (
              <a
                href={m.urlOriginal}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-800 underline-offset-2 hover:underline"
              >
                Abrir oferta
              </a>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
