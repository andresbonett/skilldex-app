"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import {
  confirmJobDraft,
  extractJobDraft,
  type JobExtractionDraft,
  type ProcessJobHabilidad,
} from "@/app/actions/process-job";
import { JobConfirmModal } from "@/components/dashboard/job-confirm-modal";
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
import { cn } from "@/lib/utils";

type FieldErrors = {
  url?: string;
  texto?: string;
};

type DuplicateInfo = {
  jobId: number;
  cargo: string;
  empresa: string;
};

type FormError = {
  message: string;
  kind?: "ai" | "system" | "validation";
  code?: string;
  detail?: string;
  logId?: string;
};

export function JobPasteForm() {
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [provider, setProvider] = useState<AIProvider>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODELS[DEFAULT_PROVIDER]);
  const [message, setMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<FormError | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [duplicate, setDuplicate] = useState<DuplicateInfo | null>(null);
  const [draft, setDraft] = useState<JobExtractionDraft | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isExtracting, startExtract] = useTransition();
  const [isSaving, startSave] = useTransition();
  const [showDetail, setShowDetail] = useState(false);

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

  function validateClient(): FieldErrors {
    const next: FieldErrors = {};
    if (!url.trim()) {
      next.url = "La URL es obligatoria para el seguimiento de la oferta.";
    }
    if (!texto.trim()) {
      next.texto = "Pega el texto de la vacante para poder extraerla.";
    }
    return next;
  }

  function runExtract(force: boolean) {
    setMessage(null);
    setFormError(null);
    setShowDetail(false);

    if (!force) {
      setFieldErrors({});
      setDuplicate(null);

      const clientErrors = validateClient();
      if (clientErrors.url || clientErrors.texto) {
        setFieldErrors(clientErrors);
        setFormError({
          message: "Revisa los campos marcados del formulario.",
          kind: "validation",
          code: "VALIDATION",
        });
        return;
      }
    }

    startExtract(async () => {
      const result = await extractJobDraft({
        textoVacante: texto,
        urlOriginal: url,
        provider,
        model,
        force,
      });

      if (!result.success) {
        setFieldErrors(result.fieldErrors ?? {});

        if (
          result.code === "DUPLICATE_URL" &&
          result.existingJobId != null &&
          result.existingCargo &&
          result.existingEmpresa
        ) {
          setDuplicate({
            jobId: result.existingJobId,
            cargo: result.existingCargo,
            empresa: result.existingEmpresa,
          });
          setFormError(null);
          return;
        }

        setFormError({
          message: result.error,
          kind:
            result.errorKind ??
            (result.code === "AI_ERROR"
              ? "ai"
              : result.code === "SYSTEM_ERROR"
                ? "system"
                : "validation"),
          code: result.errorCode ?? result.code,
          detail: result.detail,
          logId: result.logId,
        });
        return;
      }

      setDuplicate(null);
      setFieldErrors({});
      setFormError(null);
      setDraft(result.draft);
      setConfirmOpen(true);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    runExtract(false);
  }

  function onDiscardDuplicate() {
    setDuplicate(null);
    setFormError(null);
    setFieldErrors({});
    setMessage("No se volvió a registrar la vacante.");
  }

  function onForceAdd() {
    runExtract(true);
  }

  function onConfirmDraft(selected: ProcessJobHabilidad[]) {
    if (!draft) return;

    startSave(async () => {
      const result = await confirmJobDraft({
        draft,
        selectedHabilidades: selected,
      });

      if (!result.success) {
        setConfirmOpen(false);
        setFormError({
          message: result.error,
          kind:
            result.errorKind ??
            (result.code === "AI_ERROR"
              ? "ai"
              : result.code === "SYSTEM_ERROR"
                ? "system"
                : "validation"),
          code: result.errorCode ?? result.code,
          detail: result.detail,
          logId: result.logId,
        });
        return;
      }

      setConfirmOpen(false);
      setDraft(null);
      setTexto("");
      setUrl("");
      setDuplicate(null);
      setFieldErrors({});
      setFormError(null);

      const requeridas = result.habilidades.filter(
        (h) => h.exigencia === "requerida",
      ).length;
      const valoradas = result.habilidades.filter(
        (h) => h.exigencia === "valorada",
      ).length;
      const blandas = result.habilidades.filter((h) => h.tipo === "blanda")
        .length;
      const verbo = result.reprocessed ? "actualizada" : "guardada";
      setMessage(
        `Vacante ${verbo}: ${result.cargo} en ${result.empresa} (${result.habilidades.length} habilidades confirmadas: ${requeridas} requeridas, ${valoradas} valoradas, ${blandas} blandas).`,
      );
    });
  }

  const isPending = isExtracting || isSaving;
  const errorTitle =
    formError?.kind === "ai"
      ? "Error de IA"
      : formError?.kind === "system"
        ? "Error de sistema"
        : "Error";

  return (
    <>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <label
            htmlFor="url-oferta"
            className="text-sm font-medium text-foreground"
          >
            URL de la oferta{" "}
            <span className="font-normal text-destructive">*</span>
          </label>
          <Input
            id="url-oferta"
            type="url"
            inputMode="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (fieldErrors.url || duplicate) {
                setFieldErrors((prev) => ({ ...prev, url: undefined }));
                setDuplicate(null);
                setFormError(null);
              }
            }}
            placeholder="https://www.linkedin.com/jobs/view/…"
            className={cn(
              "bg-white/70",
              fieldErrors.url &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.url)}
            aria-describedby={fieldErrors.url ? "url-oferta-error" : undefined}
          />
          {fieldErrors.url ? (
            <p
              id="url-oferta-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {fieldErrors.url}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Obligatoria para seguimiento. LinkedIn acepta tanto{" "}
              <code className="text-[0.7rem]">/jobs/view/…</code> como búsqueda
              con <code className="text-[0.7rem]">currentJobId</code> (se
              unifican). También valen elempleo, infojobs, indeed u otros.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label
            htmlFor="vacante"
            className="text-sm font-medium text-foreground"
          >
            Pegar vacante{" "}
            <span className="font-normal text-destructive">*</span>
          </label>
          <Textarea
            id="vacante"
            value={texto}
            onChange={(e) => {
              setTexto(e.target.value);
              if (fieldErrors.texto) {
                setFieldErrors((prev) => ({ ...prev, texto: undefined }));
                setFormError(null);
              }
            }}
            placeholder="Copia y pega aquí el texto de la vacante (LinkedIn, email, etc.)"
            className={cn(
              "min-h-40 resize-y bg-white/70",
              fieldErrors.texto &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
            disabled={isPending}
            aria-invalid={Boolean(fieldErrors.texto)}
            aria-describedby={fieldErrors.texto ? "vacante-error" : undefined}
          />
          {fieldErrors.texto ? (
            <p
              id="vacante-error"
              className="text-xs text-destructive"
              role="alert"
            >
              {fieldErrors.texto}
            </p>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">
              Proveedor IA
            </span>
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

        {duplicate ? (
          <div
            className="rounded-xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            role="status"
          >
            <p className="font-medium">Esta vacante ya fue asignada</p>
            <p className="mt-1 text-amber-900/90">
              «{duplicate.cargo}» en {duplicate.empresa} ya está en tu tablero.
              Puedes descartar el envío o continuar para revisar y confirmar
              habilidades.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={onDiscardDuplicate}
              >
                Descartar
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={isPending}
                onClick={onForceAdd}
              >
                {isExtracting ? (
                  <Loader2Icon
                    className="animate-spin"
                    data-icon="inline-start"
                  />
                ) : null}
                Extraer de todos modos
              </Button>
            </div>
          </div>
        ) : null}

        {formError && !duplicate ? (
          <div
            className={cn(
              "rounded-xl border px-4 py-3 text-sm",
              formError.kind === "ai"
                ? "border-violet-300/80 bg-violet-50 text-violet-950"
                : formError.kind === "system"
                  ? "border-orange-300/80 bg-orange-50 text-orange-950"
                  : "border-destructive/30 bg-destructive/5 text-destructive",
            )}
            role="alert"
          >
            <p className="font-medium">{errorTitle}</p>
            <p className="mt-1 opacity-90">{formError.message}</p>
            {(formError.code || formError.logId) && (
              <p className="mt-2 text-[0.7rem] opacity-70">
                {formError.code ? `Código: ${formError.code}` : null}
                {formError.code && formError.logId ? " · " : null}
                {formError.logId ? `Log: ${formError.logId}` : null}
              </p>
            )}
            {formError.detail ? (
              <div className="mt-2">
                <button
                  type="button"
                  className="text-xs font-medium underline-offset-2 hover:underline"
                  onClick={() => setShowDetail((v) => !v)}
                >
                  {showDetail
                    ? "Ocultar detalle técnico"
                    : "Ver detalle técnico"}
                </button>
                {showDetail ? (
                  <pre className="mt-2 max-h-40 overflow-auto rounded-lg bg-black/5 p-2 text-[0.65rem] leading-relaxed whitespace-pre-wrap break-words">
                    {formError.detail}
                  </pre>
                ) : null}
              </div>
            ) : null}
            {(formError.kind === "ai" || formError.kind === "system") && (
              <p className="mt-2 text-[0.7rem] opacity-70">
                Registro completo en <code>logs/skilldex.log</code>
              </p>
            )}
          </div>
        ) : null}

        {message ? (
          <div
            className="rounded-xl border border-emerald-300/70 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {message}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={isPending || Boolean(duplicate)}
            size="lg"
          >
            {isExtracting && !duplicate ? (
              <Loader2Icon className="animate-spin" data-icon="inline-start" />
            ) : (
              <SparklesIcon data-icon="inline-start" />
            )}
            {isExtracting && !duplicate ? "Analizando…" : "Extraer vacante"}
          </Button>
        </div>
      </form>

      <JobConfirmModal
        open={confirmOpen}
        draft={draft}
        isSaving={isSaving}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          if (!open && !isSaving) {
            setDraft(null);
          }
        }}
        onConfirm={onConfirmDraft}
      />
    </>
  );
}
