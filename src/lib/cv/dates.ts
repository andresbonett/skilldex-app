/** Utilidades de fechas de experiencia/formación para CV ATS. */

const MONTH_ABBR_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

const MONTH_LOOKUP: Record<string, number> = {
  ene: 1,
  enero: 1,
  jan: 1,
  january: 1,
  feb: 2,
  febrero: 2,
  february: 2,
  mar: 3,
  marzo: 3,
  march: 3,
  abr: 4,
  abril: 4,
  apr: 4,
  april: 4,
  may: 5,
  mayo: 5,
  jun: 6,
  junio: 6,
  june: 6,
  jul: 7,
  julio: 7,
  july: 7,
  ago: 8,
  agosto: 8,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  septiembre: 9,
  september: 9,
  oct: 10,
  octubre: 10,
  october: 10,
  nov: 11,
  noviembre: 11,
  november: 11,
  dic: 12,
  diciembre: 12,
  dec: 12,
  december: 12,
};

const PRESENT_RE =
  /^(actualidad|actual|presente|present|hoy|current|now|today)$/i;

export function isPresentDate(value: string | null | undefined): boolean {
  return PRESENT_RE.test((value ?? "").trim());
}

export type CvYearMonth = { year: number; month: number };

/**
 * Interpreta fechas de CV: `YYYY-MM`, `YYYY-MM-DD`, `YYYY`, `Ago 2021`, `Actualidad`.
 * `preferEndOfYear` aplica a años sueltos (fin de periodo → diciembre).
 */
export function parseCvYearMonth(
  value: string | null | undefined,
  options?: { now?: Date; preferEndOfYear?: boolean },
): CvYearMonth | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;

  const now = options?.now ?? new Date();
  if (isPresentDate(raw)) {
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  }

  const iso = raw.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    if (month >= 1 && month <= 12) return { year, month };
    return null;
  }

  if (/^\d{4}$/.test(raw)) {
    const year = Number(raw);
    return {
      year,
      month: options?.preferEndOfYear ? 12 : 1,
    };
  }

  const named = raw.match(/^([A-Za-zÁÉÍÓÚáéíóúüÜñÑ.]+)\s+(\d{4})$/);
  if (named) {
    const key = named[1]!.replace(/\./g, "").toLowerCase();
    const month = MONTH_LOOKUP[key];
    if (month) return { year: Number(named[2]), month };
  }

  return null;
}

/** Valor canónico para inputs `type="month"` o almacenamiento. */
export function toMonthInputValue(
  value: string | null | undefined,
  options?: { now?: Date; preferEndOfYear?: boolean },
): string {
  if (isPresentDate(value)) return "";
  const parsed = parseCvYearMonth(value, options);
  if (!parsed) return "";
  return `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
}

/** Etiqueta legible ATS: `Ago 2021`. */
export function formatCvMonthLabel(
  value: string | null | undefined,
  options?: { now?: Date; preferEndOfYear?: boolean },
): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  if (isPresentDate(raw)) return "Actualidad";

  const parsed = parseCvYearMonth(raw, options);
  if (!parsed) return raw;

  // Año suelto sin mes explícito: mostrar solo el año.
  if (/^\d{4}$/.test(raw)) return String(parsed.year);

  return `${MONTH_ABBR_ES[parsed.month - 1]} ${parsed.year}`;
}

export function monthsBetween(start: CvYearMonth, end: CvYearMonth): number {
  return (end.year - start.year) * 12 + (end.month - start.month);
}

/**
 * Duración en meses con redondeo: si ya estás en el último mes antes del
 * aniversario siguiente (resto 11), sube al año completo.
 */
export function formatDurationLabel(
  start: string,
  end: string,
  now: Date = new Date(),
): string {
  const startYm = parseCvYearMonth(start, { now, preferEndOfYear: false });
  if (!startYm) return "";

  const endYm = parseCvYearMonth(end, {
    now,
    preferEndOfYear: !isPresentDate(end),
  });
  if (!endYm) return "";

  let totalMonths = monthsBetween(startYm, endYm);
  if (totalMonths < 0) return "";
  if (totalMonths === 0) return "menos de 1 mes";

  let years = Math.floor(totalMonths / 12);
  let months = totalMonths % 12;

  // Último mes antes de cumplir el siguiente año → redondear hacia arriba.
  if (months === 11) {
    years += 1;
    months = 0;
  }

  if (years === 0) {
    return months === 1 ? "1 mes" : `${months} meses`;
  }

  const yearsPart = years === 1 ? "1 año" : `${years} años`;
  if (months === 0) return yearsPart;
  const monthsPart = months === 1 ? "1 mes" : `${months} meses`;
  return `${yearsPart} ${monthsPart}`;
}

export function computeExperienceDurationLabel(
  start: string,
  end: string,
  now: Date = new Date(),
): string {
  return formatDurationLabel(start, end, now);
}

/** Canoniza fechas de experiencia a `YYYY-MM` / `Actualidad` y recalcula duración. */
export function withComputedDurations<
  T extends {
    experience: {
      start: string;
      end: string;
      durationLabel?: string;
    }[];
  },
>(doc: T, now: Date = new Date()): T {
  return {
    ...doc,
    experience: doc.experience.map((job) => {
      const end = isPresentDate(job.end)
        ? "Actualidad"
        : toMonthInputValue(job.end, { now, preferEndOfYear: true }) ||
          job.end;
      const start =
        toMonthInputValue(job.start, { now, preferEndOfYear: false }) ||
        job.start;
      return {
        ...job,
        start,
        end,
        durationLabel: computeExperienceDurationLabel(start, end, now),
      };
    }),
  };
}
