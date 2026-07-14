/**
 * Normaliza URLs de ofertas para deduplicar la misma vacante
 * aunque el enlace venga de búsqueda, tracking o otro formato del portal.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "utm_id",
  "fbclid",
  "gclid",
  "gbraid",
  "wbraid",
  "mc_cid",
  "mc_eid",
  "refid",
  "trackingid",
  "ebp",
  "origin",
  "trk",
  "originalSubdomain",
]);

function isLinkedInHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "linkedin.com" || host.endsWith(".linkedin.com");
}

function isIndeedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "indeed.com" || host.endsWith(".indeed.com");
}

/** Extrae el ID numérico de una vacante LinkedIn. */
export function extractLinkedInJobId(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);
    if (!isLinkedInHost(url.hostname)) return null;

    const fromQuery = url.searchParams.get("currentJobId");
    if (fromQuery && /^\d{5,}$/.test(fromQuery)) {
      return fromQuery;
    }

    // /jobs/view/4432033948  o  /jobs/view/titulo-at-empresa-4432033948
    const viewMatch = url.pathname.match(
      /\/jobs\/view\/(?:[^/]*-)?(\d{5,})\/?$/i,
    );
    if (viewMatch?.[1]) return viewMatch[1];

    // Algunas rutas legacy incluyen el id en el path
    const pathId = url.pathname.match(/\/jobs\/(\d{5,})\/?$/i);
    if (pathId?.[1]) return pathId[1];

    return null;
  } catch {
    const loose = trimmed.match(/(?:currentJobId=|\/jobs\/view\/)(\d{5,})/i);
    return loose?.[1] ?? null;
  }
}

function canonicalLinkedInJobUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs/view/${jobId}`;
}

function stripTrackingParams(url: URL): void {
  const toDelete: string[] = [];
  for (const key of url.searchParams.keys()) {
    if (TRACKING_PARAMS.has(key.toLowerCase())) {
      toDelete.push(key);
    }
  }
  for (const key of toDelete) {
    url.searchParams.delete(key);
  }
}

function normalizeIndeedUrl(url: URL): string {
  const jk =
    url.searchParams.get("jk") ?? url.searchParams.get("vjk") ?? null;

  if (jk) {
    const host = url.hostname.toLowerCase();
    return `https://${host}/viewjob?jk=${encodeURIComponent(jk)}`;
  }

  stripTrackingParams(url);
  return finalizeGeneric(url);
}

function finalizeGeneric(url: URL): string {
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  stripTrackingParams(url);

  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.slice(0, -1);
  }

  // Orden estable de query params para dedupe
  if ([...url.searchParams].length > 0) {
    const sorted = [...url.searchParams.entries()].sort((a, b) =>
      a[0].localeCompare(b[0]),
    );
    url.search = "";
    for (const [k, v] of sorted) {
      url.searchParams.append(k, v);
    }
  }

  return url.toString();
}

/**
 * Devuelve una URL canónica para almacenar y comparar.
 * LinkedIn (view + search-results con currentJobId) → /jobs/view/{id}
 * Indeed con jk → /viewjob?jk=…
 * Resto de portales (elempleo, infojobs, etc.) → host en minúsculas,
 * sin hash ni tracking típico.
 */
export function normalizeJobUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;
    const url = new URL(withProtocol);

    if (isLinkedInHost(url.hostname)) {
      const jobId = extractLinkedInJobId(trimmed);
      if (jobId) {
        return canonicalLinkedInJobUrl(jobId);
      }
      // Perfil LinkedIn sin job id: normalización genérica (no es una oferta)
      return finalizeGeneric(url);
    }

    if (isIndeedHost(url.hostname)) {
      return normalizeIndeedUrl(url);
    }

    return finalizeGeneric(url);
  } catch {
    return trimmed.replace(/\/+$/, "").toLowerCase();
  }
}

/** True si ambas URLs apuntan a la misma vacante tras normalizar. */
export function isSameJobUrl(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const na = normalizeJobUrl(a);
  const nb = normalizeJobUrl(b);
  if (!na || !nb) return false;
  return na === nb;
}
