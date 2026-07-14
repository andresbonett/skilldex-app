import type {
  EstadoHabilidad,
  ExigenciaHabilidad,
  NivelDominio,
  TipoHabilidad,
} from "@/db/schema";

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

export const TIPO_HABILIDAD_LABELS: Record<TipoHabilidad, string> = {
  tecnica: "Técnica",
  blanda: "Blanda",
  requisito: "Requisito",
};

export const EXIGENCIA_HABILIDAD_LABELS: Record<ExigenciaHabilidad, string> = {
  requerida: "Requerida",
  valorada: "Valorada",
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
