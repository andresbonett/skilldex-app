import {
  APICallError,
  AISDKError,
  JSONParseError,
  LoadAPIKeyError,
  NoObjectGeneratedError,
  RetryError,
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
  /** Detalle técnico (mensaje original + cuerpo de respuesta si existe). */
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

function responseBodyOf(error: unknown): string | undefined {
  if (APICallError.isInstance(error) && typeof error.responseBody === "string") {
    return error.responseBody;
  }
  if (
    error &&
    typeof error === "object" &&
    "responseBody" in error &&
    typeof (error as { responseBody?: unknown }).responseBody === "string"
  ) {
    return (error as { responseBody: string }).responseBody;
  }
  return undefined;
}

/** Desenvuelve RetryError / cause para clasificar el fallo real del proveedor. */
function unwrapError(error: unknown): unknown {
  if (RetryError.isInstance(error)) {
    return error.lastError ?? error.errors.at(-1) ?? error;
  }
  if (error instanceof Error && error.cause !== undefined) {
    return error.cause;
  }
  return error;
}

function buildDetail(error: unknown, root: unknown): string {
  const parts: string[] = [];
  const rootMsg = rawMessage(root);
  const leafMsg = rawMessage(error);
  if (rootMsg) parts.push(rootMsg);
  if (leafMsg && leafMsg !== rootMsg) parts.push(leafMsg);

  const body = responseBodyOf(error) ?? responseBodyOf(root);
  if (body) {
    const trimmed = body.length > 1200 ? `${body.slice(0, 1200)}…` : body;
    parts.push(`Respuesta: ${trimmed}`);
  }

  const status = statusOf(error) ?? statusOf(root);
  if (status !== undefined && !parts.some((p) => p.includes(String(status)))) {
    parts.push(`HTTP ${status}`);
  }

  return parts.filter(Boolean).join("\n") || String(root);
}

/**
 * Clasifica errores de IA / sistema con mensajes en español.
 * Sirve para extracción de vacantes, revisión y optimización de CV.
 */
export function classifyProcessError(error: unknown): ClassifiedError {
  const leaf = unwrapError(error);
  const detail = buildDetail(leaf, error);
  const haystack = detail;
  const status = statusOf(leaf) ?? statusOf(error);

  if (
    LoadAPIKeyError.isInstance(leaf) ||
    LoadAPIKeyError.isInstance(error) ||
    /falta la variable de entorno|api[_ ]?key/i.test(haystack)
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
    NoObjectGeneratedError.isInstance(leaf) ||
    NoObjectGeneratedError.isInstance(error) ||
    TypeValidationError.isInstance(leaf) ||
    TypeValidationError.isInstance(error) ||
    JSONParseError.isInstance(leaf) ||
    JSONParseError.isInstance(error) ||
    /did not match schema|no object generated|invalid.*json|TypeValidationError/i.test(
      haystack,
    )
  ) {
    return {
      kind: "ai",
      code: "AI_SCHEMA",
      userMessage:
        "La IA no pudo devolver un resultado estructurado válido. Prueba de nuevo o cambia de modelo/proveedor.",
      detail,
    };
  }

  if (
    status === 401 ||
    status === 403 ||
    /unauthorized|forbidden|invalid api|API_KEY_INVALID/i.test(haystack)
  ) {
    return {
      kind: "ai",
      code: "AI_AUTH",
      userMessage:
        "El proveedor de IA rechazó la autenticación. Verifica que la API key sea válida y tenga cuota.",
      detail,
    };
  }

  if (
    status === 429 ||
    /rate limit|quota|too many requests|RESOURCE_EXHAUSTED|free_tier/i.test(
      haystack,
    )
  ) {
    const freeTier = /free_tier|free tier/i.test(haystack);
    return {
      kind: "ai",
      code: "AI_RATE_LIMIT",
      userMessage: freeTier
        ? "Se agotó la cuota gratuita de Gemini (límite del free tier). Espera ~1 minuto, cambia de modelo o configura DeepSeek/OpenRouter en `.env.local`."
        : "Se alcanzó el límite de uso del proveedor de IA. Espera un momento o prueba otro proveedor.",
      detail,
    };
  }

  if (
    status === 408 ||
    /timeout|timed out|ETIMEDOUT|AbortError/i.test(haystack)
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
    APICallError.isInstance(leaf) ||
    APICallError.isInstance(error) ||
    /fetch failed|ECONNREFUSED|ENOTFOUND|network|socket|Cannot connect to API/i.test(
      haystack,
    )
  ) {
    // APICallError sin status suele ser red; con status distinto de los ya cubiertos → proveedor
    if (status !== undefined && status >= 400) {
      return {
        kind: "ai",
        code: "AI_PROVIDER",
        userMessage:
          "El proveedor de IA devolvió un error. Revisa el detalle técnico o cambia de modelo/proveedor.",
        detail,
      };
    }
    return {
      kind: "ai",
      code: "AI_NETWORK",
      userMessage:
        "No se pudo contactar al proveedor de IA. Revisa tu conexión o el estado del servicio.",
      detail,
    };
  }

  if (AISDKError.isInstance(leaf) || AISDKError.isInstance(error) || status !== undefined) {
    return {
      kind: "ai",
      code: "AI_PROVIDER",
      userMessage:
        "El proveedor de IA devolvió un error. Revisa el detalle técnico o cambia de modelo/proveedor.",
      detail,
    };
  }

  if (/UNIQUE constraint failed|SQLITE_|database|drizzle/i.test(haystack)) {
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
      "Ocurrió un error inesperado al procesar con IA. Revisa el detalle técnico o el log de sistema.",
    detail,
  };
}
