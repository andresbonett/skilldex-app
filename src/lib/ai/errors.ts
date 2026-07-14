import {
  APICallError,
  AISDKError,
  JSONParseError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  TypeValidationError,
} from "ai";

export type AppErrorKind = "ai" | "system";

export type ClassifiedError = {
  kind: AppErrorKind;
  /** Código estable para la UI / logs. */
  code:
    | "AI_CONFIG"
    | "AI_RATE_LIMIT"
    | "AI_AUTH"
    | "AI_TIMEOUT"
    | "AI_NETWORK"
    | "AI_SCHEMA"
    | "AI_PROVIDER"
    | "AI_UNKNOWN"
    | "SYSTEM_DB"
    | "SYSTEM_UNKNOWN";
  /** Mensaje claro para el usuario. */
  userMessage: string;
  /** Detalle técnico (mensaje original). */
  detail: string;
};

function statusOf(error: unknown): number | undefined {
  if (APICallError.isInstance(error)) {
    return error.statusCode;
  }
  if (error && typeof error === "object" && "statusCode" in error) {
    const s = (error as { statusCode?: unknown }).statusCode;
    return typeof s === "number" ? s : undefined;
  }
  return undefined;
}

function rawMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

/**
 * Clasifica errores de extracción (IA vs sistema) con mensajes en español.
 */
export function classifyProcessError(error: unknown): ClassifiedError {
  const detail = rawMessage(error);

  if (
    LoadAPIKeyError.isInstance(error) ||
    /falta la variable de entorno|api[_ ]?key/i.test(detail)
  ) {
    return {
      kind: "ai",
      code: "AI_CONFIG",
      userMessage:
        "Falta la API key del proveedor de IA. Revisa `.env.local` (GEMINI_API_KEY, DEEPSEEK_API_KEY u OPENROUTER_API_KEY).",
      detail,
    };
  }

  if (
    NoObjectGeneratedError.isInstance(error) ||
    TypeValidationError.isInstance(error) ||
    JSONParseError.isInstance(error) ||
    /did not match schema|no object generated|invalid.*json|schema/i.test(
      detail,
    )
  ) {
    return {
      kind: "ai",
      code: "AI_SCHEMA",
      userMessage:
        "La IA no pudo estructurar la vacante correctamente. Prueba de nuevo o cambia de modelo/proveedor.",
      detail,
    };
  }

  const status = statusOf(error);

  if (status === 401 || status === 403 || /unauthorized|forbidden|invalid api/i.test(detail)) {
    return {
      kind: "ai",
      code: "AI_AUTH",
      userMessage:
        "El proveedor de IA rechazó la autenticación. Verifica que la API key sea válida y tenga cuota.",
      detail,
    };
  }

  if (status === 429 || /rate limit|quota|too many requests/i.test(detail)) {
    return {
      kind: "ai",
      code: "AI_RATE_LIMIT",
      userMessage:
        "Se alcanzó el límite de uso del proveedor de IA. Espera un momento o prueba otro proveedor.",
      detail,
    };
  }

  if (
    status === 408 ||
    /timeout|timed out|ETIMEDOUT|AbortError/i.test(detail)
  ) {
    return {
      kind: "ai",
      code: "AI_TIMEOUT",
      userMessage:
        "La petición a la IA tardó demasiado. Inténtalo de nuevo; si persiste, usa un modelo más rápido.",
      detail,
    };
  }

  if (
    APICallError.isInstance(error) ||
    /fetch failed|ECONNREFUSED|ENOTFOUND|network|socket/i.test(detail)
  ) {
    return {
      kind: "ai",
      code: "AI_NETWORK",
      userMessage:
        "No se pudo contactar al proveedor de IA. Revisa tu conexión o el estado del servicio.",
      detail,
    };
  }

  if (AISDKError.isInstance(error) || status !== undefined) {
    return {
      kind: "ai",
      code: "AI_PROVIDER",
      userMessage:
        "El proveedor de IA devolvió un error al analizar la vacante. Revisa el detalle o cambia de modelo.",
      detail,
    };
  }

  if (/UNIQUE constraint failed|SQLITE_|database|drizzle/i.test(detail)) {
    return {
      kind: "system",
      code: "SYSTEM_DB",
      userMessage:
        "Error al guardar en la base de datos. El detalle quedó en el log de sistema.",
      detail,
    };
  }

  return {
    kind: "system",
    code: "SYSTEM_UNKNOWN",
    userMessage:
      "Ocurrió un error inesperado al procesar la vacante. Revisa el log de sistema.",
    detail,
  };
}
