import type { EstadoHabilidad, NivelDominio } from "@/db/schema";

export const ESTADO_HABILIDAD_LABELS: Record<EstadoHabilidad, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completada: "Completada",
  archivada: "Archivada",
};

export const NIVEL_DOMINIO_LABELS: Record<NivelDominio, string> = {
  basico: "Básico",
  medio: "Medio",
  avanzado: "Avanzado",
  experto: "Experto",
};

export const PROVIDER_LABELS = {
  google: "Google Gemini",
  deepseek: "DeepSeek",
  openrouter: "OpenRouter",
} as const;

export const KANBAN_COLUMNS = [
  "Por postular",
  "Postulado",
  "Entrevista",
] as const;

export type KanbanColumn = (typeof KANBAN_COLUMNS)[number];
