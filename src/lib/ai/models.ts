import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export const AI_PROVIDERS = ["google", "deepseek", "openrouter"] as const;
export type AIProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_PROVIDER: AIProvider = "google";

export const DEFAULT_MODELS: Record<AIProvider, string> = {
  google: "gemini-3.5-flash",
  deepseek: "deepseek-chat",
  openrouter: "google/gemini-3.5-flash",
};

function requireApiKey(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `Falta la variable de entorno ${name}. Configúrala en .env.local`,
    );
  }
  return value.trim();
}

/**
 * Fábrica agnóstica de modelos para alternar proveedores fácilmente.
 * Default: Google Gemini Flash.
 */
export function getModel(
  provider: AIProvider = DEFAULT_PROVIDER,
  model?: string,
): LanguageModel {
  const modelId = model?.trim() || DEFAULT_MODELS[provider];

  switch (provider) {
    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: requireApiKey("GEMINI_API_KEY", process.env.GEMINI_API_KEY),
      });
      return google(modelId);
    }
    case "deepseek": {
      const deepseek = createOpenAI({
        name: "deepseek",
        baseURL: "https://api.deepseek.com",
        apiKey: requireApiKey("DEEPSEEK_API_KEY", process.env.DEEPSEEK_API_KEY),
      });
      return deepseek(modelId);
    }
    case "openrouter": {
      const openrouter = createOpenAI({
        name: "openrouter",
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: requireApiKey(
          "OPENROUTER_API_KEY",
          process.env.OPENROUTER_API_KEY,
        ),
        headers: {
          "HTTP-Referer": process.env.OPENROUTER_HTTP_REFERER ?? "http://localhost:3000",
          "X-Title": "SkillDex",
        },
      });
      return openrouter(modelId);
    }
    default: {
      const _exhaustive: never = provider;
      throw new Error(`Proveedor de IA no soportado: ${_exhaustive}`);
    }
  }
}
