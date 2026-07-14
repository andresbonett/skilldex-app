"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { processJob } from "@/app/actions/process-job";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AI_PROVIDERS,
  DEFAULT_MODELS,
  DEFAULT_PROVIDER,
  type AIProvider,
} from "@/lib/ai/models";
import { PROVIDER_LABELS } from "@/lib/dashboard";

export function JobPasteForm() {
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<AIProvider>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODELS[DEFAULT_PROVIDER]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const modelOptions = useMemo(() => {
    const defaults = Object.values(DEFAULT_MODELS);
    if (!defaults.includes(model)) {
      return [model, ...defaults];
    }
    return defaults;
  }, [model]);

  function onProviderChange(next: string | null) {
    if (!next || !AI_PROVIDERS.includes(next as AIProvider)) return;
    const p = next as AIProvider;
    setProvider(p);
    setModel(DEFAULT_MODELS[p]);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await processJob({
        textoVacante: texto,
        urlOriginal: url,
        provider,
        model,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      setTexto("");
      setUrl("");
      setMessage(
        `Vacante guardada: ${result.cargo} en ${result.empresa} (${result.habilidades.length} habilidades).`,
      );
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label htmlFor="url-oferta" className="text-sm font-medium text-foreground">
          URL de la oferta
        </label>
        <Input
          id="url-oferta"
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.linkedin.com/jobs/view/…"
          className="bg-white/70"
          disabled={isPending}
          required
        />
        <p className="text-xs text-muted-foreground">
          Obligatoria para no registrar dos veces la misma vacante ni inflar
          frecuencias.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="vacante" className="text-sm font-medium text-foreground">
          Pegar vacante
        </label>
        <Textarea
          id="vacante"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Copia y pega aquí el texto de la vacante (LinkedIn, email, etc.)"
          className="min-h-40 resize-y bg-white/70"
          disabled={isPending}
          required
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Proveedor IA</span>
          <Select value={provider} onValueChange={onProviderChange}>
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_PROVIDERS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PROVIDER_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Modelo</span>
          <Select
            value={model}
            onValueChange={(v) => {
              if (v) setModel(v);
            }}
          >
            <SelectTrigger className="w-full bg-white/70">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          disabled={isPending || !texto.trim() || !url.trim()}
          size="lg"
        >
          {isPending ? (
            <Loader2Icon className="animate-spin" data-icon="inline-start" />
          ) : (
            <SparklesIcon data-icon="inline-start" />
          )}
          {isPending ? "Analizando…" : "Extraer y guardar"}
        </Button>
        {message ? (
          <p className="text-sm text-emerald-800">{message}</p>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
      </div>
    </form>
  );
}
