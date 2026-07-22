"use client";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  pdf,
} from "@react-pdf/renderer";

import type { CvDocument } from "@/lib/cv/schema";
import { toAtsView } from "@/lib/cv/ats-view";

/**
 * Tipografía ATS: Helvetica (estándar del sistema en PDF).
 * Jerarquía, márgenes e interlineado alineados a prácticas ATS.
 * 1 in = 72 pt; 2.5 cm ≈ 71 pt.
 */
const MARGIN = 72; // 1 in / ~2.5 cm por lado
const GAP = 6;
const SECTION_GAP = 12;
const LINE_HEIGHT = 1.2;

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1e293b",
    paddingTop: MARGIN,
    paddingBottom: MARGIN,
    paddingHorizontal: MARGIN,
    lineHeight: LINE_HEIGHT,
  },
  header: { textAlign: "center", marginBottom: SECTION_GAP },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 6,
  },
  headline: {
    fontSize: 11.5,
    fontFamily: "Helvetica",
    color: "#334155",
    marginBottom: 6,
  },
  contact: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#475569",
    lineHeight: LINE_HEIGHT,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
    marginTop: SECTION_GAP,
    marginBottom: GAP,
  },
  sectionTitleCompact: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 2,
    marginTop: 10,
    marginBottom: 4,
  },
  paragraph: {
    fontSize: 10.5,
    fontFamily: "Helvetica",
    marginBottom: GAP,
    textAlign: "justify",
    lineHeight: LINE_HEIGHT,
  },
  competencies: {
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: LINE_HEIGHT,
    marginBottom: 4,
    color: "#334155",
  },
  skillGroup: {
    marginBottom: 2,
    fontSize: 10,
    fontFamily: "Helvetica",
    lineHeight: LINE_HEIGHT,
    color: "#334155",
  },
  skillLabel: { fontFamily: "Helvetica-Bold", color: "#0f172a" },
  entry: { marginBottom: GAP + 2 },
  entryTitle: {
    fontSize: 11.5,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 2,
  },
  entrySub: {
    fontSize: 11,
    fontFamily: "Helvetica",
    color: "#334155",
    marginBottom: 2,
  },
  entryMeta: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#475569",
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: "row",
    marginBottom: 3,
    paddingLeft: 2,
  },
  bulletMark: {
    width: 12,
    fontSize: 10.5,
    fontFamily: "Helvetica",
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    fontFamily: "Helvetica",
    textAlign: "justify",
    lineHeight: LINE_HEIGHT,
  },
});

/** Separadores ASCII-seguros para parsers ATS. */
function formatPeriod(start?: string, end?: string) {
  const s = start?.trim();
  const e = end?.trim();
  if (!s && !e) return "";
  if (s && e) return `${s} - ${e}`;
  return s || e || "";
}

function CvPdfDocument({ data }: { data: CvDocument }) {
  const view = toAtsView(data);
  const { basics, profile, skillGroups, experience, education, languages } =
    view;
  const links = [
    basics.links.linkedin ? `LinkedIn: ${basics.links.linkedin}` : null,
    basics.links.github ? `GitHub: ${basics.links.github}` : null,
    basics.links.portfolio ? basics.links.portfolio : null,
  ].filter(Boolean);

  return (
    <Document
      title={`${basics.fullName} - CV`}
      author={basics.fullName}
      subject="CV ATS"
      keywords="curriculum, resume, ATS"
      language="es"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{basics.fullName}</Text>
          <Text style={styles.headline}>{basics.headline}</Text>
          <Text style={styles.contact}>
            {[basics.location, basics.phone, basics.email]
              .filter(Boolean)
              .join(" | ")}
          </Text>
          {basics.availability ? (
            <Text style={styles.contact}>{basics.availability}</Text>
          ) : null}
          {links.length > 0 ? (
            <Text style={styles.contact}>{links.join(" | ")}</Text>
          ) : null}
        </View>

        <Text style={styles.sectionTitle}>Perfil Profesional</Text>
        <Text style={styles.paragraph}>{profile}</Text>

        <Text style={styles.sectionTitle}>Experiencia Profesional</Text>
        {experience.map((job, idx) => {
          const period = formatPeriod(job.start, job.end);
          const meta = [period, job.durationLabel].filter(Boolean).join(" | ");
          return (
            <View key={`${job.company}-${idx}`} style={styles.entry}>
              <Text style={styles.entryTitle}>{job.title}</Text>
              <Text style={styles.entrySub}>
                {job.company}
                {job.location ? ` - ${job.location}` : ""}
              </Text>
              {meta ? <Text style={styles.entryMeta}>{meta}</Text> : null}
              {job.summary ? (
                <Text style={styles.paragraph}>{job.summary}</Text>
              ) : null}
              {job.bullets.map((bullet, i) => (
                <View key={i} style={styles.bulletRow}>
                  <Text style={styles.bulletMark}>• </Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          );
        })}

        {view.projects.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Proyectos Destacados</Text>
            {view.projects.map((p, i) => (
              <View key={i} style={styles.entry}>
                <Text style={styles.entryTitle}>
                  {p.name}
                  {p.role ? ` - ${p.role}` : ""}
                </Text>
                {p.description ? (
                  <Text style={styles.paragraph}>{p.description}</Text>
                ) : null}
                {p.highlights.map((h, hi) => (
                  <View key={hi} style={styles.bulletRow}>
                    <Text style={styles.bulletMark}>• </Text>
                    <Text style={styles.bulletText}>{h}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : null}

        {view.leadership.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Liderazgo y Colaboración</Text>
            {view.leadership.map((item, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletMark}>• </Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Formación y Certificaciones</Text>
        {education.map((ed, i) => {
          const period = formatPeriod(ed.start, ed.end);
          return (
            <View key={i} style={styles.entry}>
              <Text style={styles.entryTitle}>{ed.title}</Text>
              <Text style={styles.entrySub}>{ed.institution}</Text>
              {period || ed.detail ? (
                <Text style={styles.entryMeta}>
                  {[period, ed.detail].filter(Boolean).join(" | ")}
                </Text>
              ) : null}
            </View>
          );
        })}

        <Text style={styles.sectionTitle}>Idiomas</Text>
        {languages.map((lang, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bulletMark}>• </Text>
            <Text style={styles.bulletText}>
              {lang.name}: {lang.level}
            </Text>
          </View>
        ))}

        {view.coreCompetencies.length > 0 ? (
          <>
            <Text style={styles.sectionTitleCompact}>Competencias Clave</Text>
            <Text style={styles.competencies}>
              {view.coreCompetencies.join(" | ")}
            </Text>
          </>
        ) : null}

        {skillGroups.length > 0 ? (
          <>
            <Text style={styles.sectionTitleCompact}>Habilidades Técnicas</Text>
            {skillGroups.map((group) => (
              <Text key={group.label} style={styles.skillGroup}>
                <Text style={styles.skillLabel}>{group.label}: </Text>
                {group.items.join(", ")}.
              </Text>
            ))}
          </>
        ) : null}
      </Page>
    </Document>
  );
}

export async function downloadCvPdf(data: CvDocument, filename?: string) {
  const blob = await pdf(<CvPdfDocument data={data} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    filename ??
    `${data.basics.fullName.replace(/\s+/g, "-")}-CV.pdf`.toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

export { CvPdfDocument };
