import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type LogLevel = "debug" | "info" | "warn" | "error";

export type SystemLogEntry = {
  id: string;
  level: LogLevel;
  scope: string;
  message: string;
  /** Detalle técnico para depuración (no siempre se muestra al usuario). */
  detail?: string;
  meta?: Record<string, unknown>;
  at: string;
};

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "skilldex.log");

function serializeError(error: unknown): string {
  if (error instanceof Error) {
    const base = `${error.name}: ${error.message}`;
    return error.stack ? `${base}\n${error.stack}` : base;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

async function appendToFile(line: string): Promise<void> {
  try {
    await mkdir(LOG_DIR, { recursive: true });
    await appendFile(LOG_FILE, `${line}\n`, "utf8");
  } catch {
    // No bloquear el flujo si el filesystem falla (p. ej. read-only).
  }
}

/**
 * Logger de sistema: consola + archivo `logs/skilldex.log`.
 * Devuelve un id de correlacion para mostrar en la UI.
 */
export async function logSystem(
  level: LogLevel,
  scope: string,
  message: string,
  options?: {
    error?: unknown;
    detail?: string;
    meta?: Record<string, unknown>;
  },
): Promise<SystemLogEntry> {
  const entry: SystemLogEntry = {
    id: randomUUID().slice(0, 8),
    level,
    scope,
    message,
    detail:
      options?.detail ??
      (options?.error !== undefined ? serializeError(options.error) : undefined),
    meta: options?.meta,
    at: new Date().toISOString(),
  };

  const line = JSON.stringify(entry);
  const prefix = `[${entry.at}] [${level.toUpperCase()}] [${scope}] (${entry.id})`;

  if (level === "error") {
    console.error(prefix, message, options?.meta ?? "", entry.detail ?? "");
  } else if (level === "warn") {
    console.warn(prefix, message, options?.meta ?? "");
  } else {
    console.info(prefix, message, options?.meta ?? "");
  }

  await appendToFile(line);
  return entry;
}
