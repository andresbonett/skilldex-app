"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowLeftIcon,
  DownloadIcon,
  FileUpIcon,
  Loader2Icon,
  SaveIcon,
  SparklesIcon,
  WandSparklesIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import {
  importResumeJson,
  optimizeResumeForMarketSkills,
  reviewResumeWithAI,
  saveResume,
  type ResumeBundle,
} from "@/app/actions/resume";
import { AtsPreview } from "@/components/cv/ats-preview";
import { downloadCvPdf } from "@/components/cv/cv-pdf-document";
import { JobMatchAlerts } from "@/components/cv/job-match-alerts";
import { VersionHistory } from "@/components/cv/version-history";
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
import type { JobMatchResult } from "@/lib/cv/match";
import {
  TECHNICAL_SKILL_KEYS,
  TECHNICAL_SKILL_LABELS,
  type CvDocument,
  type TechnicalSkillKey,
  serializeCvDocument,
} from "@/lib/cv/schema";
import { PROVIDER_LABELS } from "@/lib/dashboard";

function Panel({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border/60 bg-white/55 p-4 shadow-sm backdrop-blur-md sm:p-5">
      <h2 className="font-[family-name:var(--font-display)] text-lg tracking-tight">
        {title}
      </h2>
      {description ? (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      ) : null}
      <div className="mt-3">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-xs font-medium text-muted-foreground">
      {children}
    </label>
  );
}

function listToLines(items: string[]): string {
  return items.join("\n");
}

function linesToList(value: string): string[] {
  return value
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function csvToList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CvShell({
  initialResume,
  initialMatches,
}: {
  initialResume: ResumeBundle;
  initialMatches: JobMatchResult[];
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [data, setData] = useState<CvDocument>(initialResume.data);
  const [versions, setVersions] = useState(initialResume.versions);
  const [currentVersionId, setCurrentVersionId] = useState(
    initialResume.currentVersionId,
  );
  const [matches, setMatches] = useState(initialMatches);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);
  const [metaJson, setMetaJson] = useState(() =>
    JSON.stringify(
      {
        cloudAndInfrastructureExperience: initialResume.data.cloudAndInfrastructureExperience,
        aiAndDeveloperProductivity: initialResume.data.aiAndDeveloperProductivity,
        designAndProductCollaboration: initialResume.data.designAndProductCollaboration,
        databasesAndBackendLearning: initialResume.data.databasesAndBackendLearning,
        careerPositioning: initialResume.data.careerPositioning,
        cvNotes: initialResume.data.cvNotes,
        methodologies: initialResume.data.methodologies,
        softSkills: initialResume.data.softSkills,
        atsKeywords: initialResume.data.atsKeywords,
      },
      null,
      2,
    ),
  );
  const [provider, setProvider] = useState<AIProvider>(DEFAULT_PROVIDER);
  const [model, setModel] = useState(DEFAULT_MODELS[DEFAULT_PROVIDER]);
  const [pending, startTransition] = useTransition();
  const [pdfPending, setPdfPending] = useState(false);

  const modelOptions = useMemo(() => {
    const defaults = Object.values(DEFAULT_MODELS);
    if (!defaults.includes(model)) return [model, ...defaults];
    return defaults;
  }, [model]);

  const syncFromBundle = useCallback((bundle: ResumeBundle) => {
    setData(bundle.data);
    setVersions(bundle.versions);
    setCurrentVersionId(bundle.currentVersionId);
    setMetaJson(
      JSON.stringify(
        {
          cloudAndInfrastructureExperience:
            bundle.data.cloudAndInfrastructureExperience,
          aiAndDeveloperProductivity: bundle.data.aiAndDeveloperProductivity,
          designAndProductCollaboration:
            bundle.data.designAndProductCollaboration,
          databasesAndBackendLearning: bundle.data.databasesAndBackendLearning,
          careerPositioning: bundle.data.careerPositioning,
          cvNotes: bundle.data.cvNotes,
          methodologies: bundle.data.methodologies,
          softSkills: bundle.data.softSkills,
          atsKeywords: bundle.data.atsKeywords,
        },
        null,
        2,
      ),
    );
  }, []);

  function updateBasics<K extends keyof CvDocument["basics"]>(
    key: K,
    value: CvDocument["basics"][K],
  ) {
    setData((prev) => ({ ...prev, basics: { ...prev.basics, [key]: value } }));
  }

  function updateLink(
    key: keyof CvDocument["basics"]["links"],
    value: string,
  ) {
    setData((prev) => ({
      ...prev,
      basics: {
        ...prev.basics,
        links: { ...prev.basics.links, [key]: value },
      },
    }));
  }

  function updateSkillCategory(key: TechnicalSkillKey, csv: string) {
    setData((prev) => ({
      ...prev,
      technicalSkills: {
        ...prev.technicalSkills,
        [key]: csvToList(csv),
      },
    }));
  }

  function applyMetaJson(): boolean {
    try {
      const parsed = JSON.parse(metaJson) as Partial<CvDocument>;
      setData((prev) => ({
        ...prev,
        cloudAndInfrastructureExperience:
          parsed.cloudAndInfrastructureExperience ??
          prev.cloudAndInfrastructureExperience,
        aiAndDeveloperProductivity:
          parsed.aiAndDeveloperProductivity ?? prev.aiAndDeveloperProductivity,
        designAndProductCollaboration:
          parsed.designAndProductCollaboration ??
          prev.designAndProductCollaboration,
        databasesAndBackendLearning:
          parsed.databasesAndBackendLearning ??
          prev.databasesAndBackendLearning,
        careerPositioning: parsed.careerPositioning ?? prev.careerPositioning,
        cvNotes: parsed.cvNotes ?? prev.cvNotes,
        methodologies: parsed.methodologies ?? prev.methodologies,
        softSkills: parsed.softSkills ?? prev.softSkills,
        atsKeywords: parsed.atsKeywords ?? prev.atsKeywords,
      }));
      return true;
    } catch {
      setError("El bloque JSON de metadatos no es válido.");
      return false;
    }
  }

  function onProviderChange(next: string | null) {
    if (!next || !AI_PROVIDERS.includes(next as AIProvider)) return;
    const p = next as AIProvider;
    setProvider(p);
    setModel(DEFAULT_MODELS[p]);
  }

  function withMetaApplied(fn: (doc: CvDocument) => void) {
    if (!applyMetaJson()) return;
    setData((prev) => {
      // applyMetaJson already scheduled setState; read from meta merge inline
      try {
        const parsed = JSON.parse(metaJson) as Partial<CvDocument>;
        const merged: CvDocument = {
          ...prev,
          cloudAndInfrastructureExperience:
            parsed.cloudAndInfrastructureExperience ??
            prev.cloudAndInfrastructureExperience,
          aiAndDeveloperProductivity:
            parsed.aiAndDeveloperProductivity ??
            prev.aiAndDeveloperProductivity,
          designAndProductCollaboration:
            parsed.designAndProductCollaboration ??
            prev.designAndProductCollaboration,
          databasesAndBackendLearning:
            parsed.databasesAndBackendLearning ??
            prev.databasesAndBackendLearning,
          careerPositioning:
            parsed.careerPositioning ?? prev.careerPositioning,
          cvNotes: parsed.cvNotes ?? prev.cvNotes,
          methodologies: parsed.methodologies ?? prev.methodologies,
          softSkills: parsed.softSkills ?? prev.softSkills,
          atsKeywords: parsed.atsKeywords ?? prev.atsKeywords,
        };
        queueMicrotask(() => fn(merged));
        return merged;
      } catch {
        return prev;
      }
    });
  }

  function handleSave() {
    setError(null);
    setMessage(null);
    withMetaApplied((doc) => {
      startTransition(async () => {
        const result = await saveResume(doc);
        if (!result.success) {
          setError(result.error);
          return;
        }
        syncFromBundle(result.resume);
        setMessage("Versión guardada.");
        router.refresh();
      });
    });
  }

  function handleExport() {
    if (!applyMetaJson()) return;
    const blob = new Blob([serializeCvDocument(data)], {
      type: "application/json",
    });
    // Re-merge meta synchronously for export
    try {
      const parsed = JSON.parse(metaJson) as Partial<CvDocument>;
      const merged: CvDocument = {
        ...data,
        cloudAndInfrastructureExperience:
          parsed.cloudAndInfrastructureExperience ??
          data.cloudAndInfrastructureExperience,
        aiAndDeveloperProductivity:
          parsed.aiAndDeveloperProductivity ?? data.aiAndDeveloperProductivity,
        designAndProductCollaboration:
          parsed.designAndProductCollaboration ??
          data.designAndProductCollaboration,
        databasesAndBackendLearning:
          parsed.databasesAndBackendLearning ??
          data.databasesAndBackendLearning,
        careerPositioning: parsed.careerPositioning ?? data.careerPositioning,
        cvNotes: parsed.cvNotes ?? data.cvNotes,
        methodologies: parsed.methodologies ?? data.methodologies,
        softSkills: parsed.softSkills ?? data.softSkills,
        atsKeywords: parsed.atsKeywords ?? data.atsKeywords,
      };
      const out = new Blob([serializeCvDocument(merged)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(out);
      const a = document.createElement("a");
      a.href = url;
      a.download = "cv-skilldex.json";
      a.click();
      URL.revokeObjectURL(url);
      void blob;
    } catch {
      setError("No se pudo exportar: JSON de metadatos inválido.");
    }
  }

  function handleImportFile(file: File) {
    setError(null);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const result = await importResumeJson(text);
        if (!result.success) {
          setError(result.error);
          return;
        }
        syncFromBundle(result.resume);
        setMessage("JSON importado y versionado.");
        router.refresh();
      });
    };
    reader.readAsText(file);
  }

  function handleReview() {
    setError(null);
    setMessage(null);
    setReviewNotes(null);
    withMetaApplied((doc) => {
      startTransition(async () => {
        const result = await reviewResumeWithAI({
          provider,
          model,
          data: doc,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        syncFromBundle(result.resume);
        setReviewNotes(
          [
            `Score ATS: ${result.score}/100`,
            result.appliedRevision
              ? "Se aplicó una revisión al CV."
              : "Sin cambios aplicados al documento.",
            ...result.issues.map((i) => `• ${i}`),
            ...result.suggestions.map((s) => `→ ${s}`),
          ].join("\n"),
        );
        setMessage("Revisión IA completada.");
        router.refresh();
      });
    });
  }

  function handleOptimize() {
    setError(null);
    setMessage(null);
    withMetaApplied((doc) => {
      startTransition(async () => {
        const result = await optimizeResumeForMarketSkills({
          provider,
          model,
          data: doc,
        });
        if (!result.success) {
          setError(result.error);
          return;
        }
        syncFromBundle(result.resume);
        setReviewNotes(result.notes);
        setMessage("CV optimizado por cobertura de skills de mercado.");
        router.refresh();
      });
    });
  }

  async function handlePdf() {
    setPdfPending(true);
    setError(null);
    try {
      if (!applyMetaJson()) {
        setPdfPending(false);
        return;
      }
      const parsed = JSON.parse(metaJson) as Partial<CvDocument>;
      const merged: CvDocument = {
        ...data,
        cloudAndInfrastructureExperience:
          parsed.cloudAndInfrastructureExperience ??
          data.cloudAndInfrastructureExperience,
        aiAndDeveloperProductivity:
          parsed.aiAndDeveloperProductivity ?? data.aiAndDeveloperProductivity,
        designAndProductCollaboration:
          parsed.designAndProductCollaboration ??
          data.designAndProductCollaboration,
        databasesAndBackendLearning:
          parsed.databasesAndBackendLearning ??
          data.databasesAndBackendLearning,
        careerPositioning: parsed.careerPositioning ?? data.careerPositioning,
        cvNotes: parsed.cvNotes ?? data.cvNotes,
        methodologies: parsed.methodologies ?? data.methodologies,
        softSkills: parsed.softSkills ?? data.softSkills,
        atsKeywords: parsed.atsKeywords ?? data.atsKeywords,
      };
      await downloadCvPdf(merged);
      setMessage("PDF generado.");
    } catch {
      setError("No se pudo generar el PDF.");
    } finally {
      setPdfPending(false);
    }
  }

  return (
    <div className="relative isolate min-h-full flex-1 overflow-x-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_10%_-10%,oklch(0.92_0.04_185),transparent_55%),radial-gradient(900px_500px_at_90%_0%,oklch(0.93_0.03_145),transparent_50%),linear-gradient(180deg,oklch(0.985_0.01_180),oklch(0.97_0.01_160))]"
      />

      <header className="sticky top-0 z-20 border-b border-border/50 bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Link
                href="/"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowLeftIcon className="size-3.5" />
                Dashboard
              </Link>
              <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight sm:text-3xl">
                Hoja de vida
              </h1>
              <p className="text-sm text-muted-foreground">
                Perfil maestro JSON · preview ATS · IA · versiones
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={provider} onValueChange={onProviderChange}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AI_PROVIDERS.map((p) => (
                    <SelectItem key={p} value={p}>
                      {PROVIDER_LABELS[p] ?? p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={model} onValueChange={(v) => v && setModel(v)}>
                <SelectTrigger className="h-8 w-[180px] text-xs">
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

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={handleSave}
            >
              {pending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <SaveIcon />
              )}
              Guardar versión
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleExport}
            >
              <DownloadIcon />
              Export JSON
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileRef.current?.click()}
            >
              <FileUpIcon />
              Import JSON
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImportFile(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={handleReview}
            >
              <SparklesIcon />
              Revisar IA
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={pending}
              onClick={handleOptimize}
            >
              <WandSparklesIcon />
              Optimizar mercado
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={pdfPending}
              onClick={() => void handlePdf()}
            >
              {pdfPending ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <DownloadIcon />
              )}
              PDF
            </Button>
          </div>

          {message ? (
            <p className="text-xs text-teal-800">{message}</p>
          ) : null}
          {error ? (
            <p className="text-xs text-destructive">{error}</p>
          ) : null}
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Panel title="Datos básicos">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FieldLabel>Nombre</FieldLabel>
                <Input
                  value={data.basics.fullName}
                  onChange={(e) => updateBasics("fullName", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Headline</FieldLabel>
                <Input
                  value={data.basics.headline}
                  onChange={(e) => updateBasics("headline", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Ubicación</FieldLabel>
                <Input
                  value={data.basics.location}
                  onChange={(e) => updateBasics("location", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Disponibilidad</FieldLabel>
                <Input
                  value={data.basics.availability ?? ""}
                  onChange={(e) =>
                    updateBasics("availability", e.target.value)
                  }
                />
              </div>
              <div>
                <FieldLabel>Teléfono</FieldLabel>
                <Input
                  value={data.basics.phone}
                  onChange={(e) => updateBasics("phone", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <Input
                  value={data.basics.email}
                  onChange={(e) => updateBasics("email", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>LinkedIn</FieldLabel>
                <Input
                  value={data.basics.links.linkedin ?? ""}
                  onChange={(e) => updateLink("linkedin", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>GitHub</FieldLabel>
                <Input
                  value={data.basics.links.github ?? ""}
                  onChange={(e) => updateLink("github", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <FieldLabel>Portafolio</FieldLabel>
                <Input
                  value={data.basics.links.portfolio ?? ""}
                  onChange={(e) => updateLink("portfolio", e.target.value)}
                />
              </div>
              <div>
                <FieldLabel>Enfoque de carrera</FieldLabel>
                <Input
                  value={data.careerFocus ?? ""}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      careerFocus: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Años de experiencia</FieldLabel>
                <Input
                  type="number"
                  value={data.yearsOfExperience ?? 0}
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      yearsOfExperience: Number(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
          </Panel>

          <Panel title="Resumen profesional">
            <Textarea
              rows={8}
              value={data.summary}
              onChange={(e) =>
                setData((prev) => ({ ...prev, summary: e.target.value }))
              }
            />
          </Panel>

          <Panel
            title="Competencias clave"
            description="Una por línea."
          >
            <Textarea
              rows={6}
              value={listToLines(data.coreCompetencies)}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  coreCompetencies: linesToList(e.target.value),
                }))
              }
            />
          </Panel>

          <Panel
            title="Habilidades técnicas"
            description="Ítems separados por coma, por categoría."
          >
            <div className="flex flex-col gap-3">
              {TECHNICAL_SKILL_KEYS.map((key) => (
                <div key={key}>
                  <FieldLabel>{TECHNICAL_SKILL_LABELS[key]}</FieldLabel>
                  <Textarea
                    rows={2}
                    value={(data.technicalSkills[key] ?? []).join(", ")}
                    onChange={(e) => updateSkillCategory(key, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Experiencia">
            <div className="flex flex-col gap-4">
              {data.experience.map((job, ji) => (
                <div
                  key={ji}
                  className="rounded-xl border border-border/50 p-3"
                >
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <FieldLabel>Cargo</FieldLabel>
                      <Input
                        value={job.title}
                        onChange={(e) => {
                          const title = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, title };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Empresa</FieldLabel>
                      <Input
                        value={job.company}
                        onChange={(e) => {
                          const company = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, company };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Ubicación</FieldLabel>
                      <Input
                        value={job.location ?? ""}
                        onChange={(e) => {
                          const location = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, location };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Inicio</FieldLabel>
                      <Input
                        value={job.start}
                        onChange={(e) => {
                          const start = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, start };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div>
                      <FieldLabel>Fin</FieldLabel>
                      <Input
                        value={job.end}
                        onChange={(e) => {
                          const end = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, end };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Resumen del rol</FieldLabel>
                      <Textarea
                        rows={3}
                        value={job.summary ?? ""}
                        onChange={(e) => {
                          const summary = e.target.value;
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = { ...experience[ji]!, summary };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Responsabilidades (una por línea)</FieldLabel>
                      <Textarea
                        rows={8}
                        value={listToLines(job.responsibilities)}
                        onChange={(e) => {
                          const responsibilities = linesToList(e.target.value);
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = {
                              ...experience[ji]!,
                              responsibilities,
                            };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <FieldLabel>Tecnologías (coma)</FieldLabel>
                      <Textarea
                        rows={2}
                        value={(job.technologies ?? []).join(", ")}
                        onChange={(e) => {
                          const technologies = csvToList(e.target.value);
                          setData((prev) => {
                            const experience = [...prev.experience];
                            experience[ji] = {
                              ...experience[ji]!,
                              technologies,
                            };
                            return { ...prev, experience };
                          });
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel
            title="Proyectos destacados"
            description="Nombre | Rol | Descripción (una línea por proyecto; highlights aparte en el JSON meta si hace falta)."
          >
            <Textarea
              rows={8}
              value={data.featuredProjects
                .map((p) =>
                  [p.name, p.role, p.description].filter(Boolean).join(" | "),
                )
                .join("\n")}
              onChange={(e) => {
                const featuredProjects = e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line, i) => {
                    const [name, role, ...rest] = line
                      .split("|")
                      .map((s) => s.trim());
                    const prev = data.featuredProjects[i];
                    return {
                      name: name || "Proyecto",
                      role: role || "",
                      description: rest.join(" | ") || "",
                      highlights: prev?.highlights ?? [],
                      technologies: prev?.technologies ?? [],
                      status: prev?.status ?? "",
                    };
                  });
                setData((prev) => ({
                  ...prev,
                  featuredProjects: featuredProjects.length
                    ? featuredProjects
                    : prev.featuredProjects,
                }));
              }}
            />
          </Panel>

          <Panel title="Liderazgo y colaboración" description="Una por línea.">
            <Textarea
              rows={5}
              value={listToLines(data.leadershipAndCollaboration)}
              onChange={(e) =>
                setData((prev) => ({
                  ...prev,
                  leadershipAndCollaboration: linesToList(e.target.value),
                }))
              }
            />
          </Panel>

          <Panel title="Formación">
            <Textarea
              rows={4}
              value={data.education
                .map((e) =>
                  [e.title, e.institution, e.detail || e.type]
                    .filter(Boolean)
                    .join(" | "),
                )
                .join("\n")}
              onChange={(e) => {
                const education = e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const [title, institution, detail] = line
                      .split("|")
                      .map((s) => s.trim());
                    return {
                      title: title || "Título",
                      institution: institution || "Institución",
                      detail: detail || "",
                      type: "",
                      status: "",
                    };
                  });
                setData((prev) => ({
                  ...prev,
                  education: education.length ? education : prev.education,
                }));
              }}
            />
          </Panel>

          <Panel title="Idiomas">
            <Textarea
              rows={3}
              value={data.languages
                .map((l) =>
                  [l.name, l.level, l.status].filter(Boolean).join(": "),
                )
                .join("\n")}
              onChange={(e) => {
                const languages = e.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean)
                  .map((line) => {
                    const parts = line.split(":").map((s) => s.trim());
                    return {
                      name: parts[0] || "Idioma",
                      level: parts[1] || "Nivel",
                      status: parts[2] || "",
                    };
                  });
                setData((prev) => ({
                  ...prev,
                  languages: languages.length ? languages : prev.languages,
                }));
              }}
            />
          </Panel>

          <Panel
            title="Metadatos (JSON)"
            description="cloud, IA, diseño, careerPositioning, cvNotes, softSkills, atsKeywords…"
          >
            <Textarea
              rows={12}
              className="font-mono text-xs"
              value={metaJson}
              onChange={(e) => setMetaJson(e.target.value)}
              onBlur={() => applyMetaJson()}
            />
          </Panel>

          {reviewNotes ? (
            <Panel title="Notas IA">
              <pre className="whitespace-pre-wrap text-xs text-muted-foreground">
                {reviewNotes}
              </pre>
            </Panel>
          ) : null}

          <Panel
            title="Historial de versiones"
            description="Snapshots inmutables. Restaurar crea una nueva versión."
          >
            <VersionHistory
              versions={versions}
              currentVersionId={currentVersionId}
              onRestored={(resume) => {
                syncFromBundle(resume);
                setMessage("Versión restaurada.");
                router.refresh();
              }}
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
          <Panel
            title="A qué jobs enviar"
            description="Match entre tu CV / skills completadas y las ofertas activas."
          >
            <JobMatchAlerts matches={matches} />
            <Button
              type="button"
              size="xs"
              variant="ghost"
              className="mt-2"
              onClick={() => {
                startTransition(async () => {
                  const { getJobMatchRecommendations } = await import(
                    "@/app/actions/resume"
                  );
                  const next = await getJobMatchRecommendations();
                  setMatches(next);
                });
              }}
            >
              Recalcular match
            </Button>
          </Panel>

          <Panel title="Preview ATS">
            <div className="max-h-[80vh] overflow-auto rounded-lg border border-border/40 bg-slate-100/80 p-2">
              <AtsPreview data={data} />
            </div>
          </Panel>
        </div>
      </main>
    </div>
  );
}
