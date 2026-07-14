/**
 * Normaliza URL de oferta para deduplicar (protocolo, trailing slash, hash).
 */
export function normalizeJobUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    url.hash = "";

    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.slice(0, -1);
    }

    return url.toString();
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}
