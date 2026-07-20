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

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10.5,
    color: "#1e293b",
    paddingTop: 56,
    paddingBottom: 56,
    paddingHorizontal: 42,
    lineHeight: 1.5,
  },
  header: { textAlign: "center", marginBottom: 18 },
  name: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    marginBottom: 4,
  },
  headline: { fontSize: 13, color: "#475569", marginBottom: 8 },
  contact: { fontSize: 9.5, color: "#475569", lineHeight: 1.6 },
  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    borderBottomWidth: 1,
    borderBottomColor: "#cbd5e1",
    paddingBottom: 3,
    marginTop: 14,
    marginBottom: 8,
  },
  paragraph: { marginBottom: 8, textAlign: "justify" },
  skillGroup: { marginBottom: 6 },
  skillLabel: { fontFamily: "Helvetica-Bold", color: "#0f172a" },
  jobEntry: { marginBottom: 12 },
  jobHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    flex: 1,
  },
  jobDate: { fontSize: 10, color: "#0f172a" },
  jobSub: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
    fontStyle: "italic",
    color: "#475569",
    fontSize: 10,
  },
  bullet: { marginBottom: 3, paddingLeft: 10, textAlign: "justify" },
  bulletMark: { position: "absolute", left: 0 },
});

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
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.name}>{basics.fullName}</Text>
          <Text style={styles.headline}>{basics.headline}</Text>
          <Text style={styles.contact}>
            {basics.location} | {basics.phone} | {basics.email}
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

        {view.coreCompetencies.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Competencias Clave</Text>
            <Text style={styles.paragraph}>
              {view.coreCompetencies.join(" · ")}
            </Text>
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Habilidades Técnicas</Text>
        {skillGroups.map((group) => (
          <Text key={group.label} style={styles.skillGroup}>
            <Text style={styles.skillLabel}>{group.label}: </Text>
            {group.items.join(", ")}.
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Experiencia Profesional</Text>
        {experience.map((job, idx) => (
          <View key={`${job.company}-${idx}`} style={styles.jobEntry} wrap={false}>
            <View style={styles.jobHeader}>
              <Text style={styles.jobTitle}>{job.title}</Text>
              <Text style={styles.jobDate}>
                {job.start} – {job.end}
              </Text>
            </View>
            <View style={styles.jobSub}>
              <Text>
                {job.company}
                {job.location ? ` — ${job.location}` : ""}
              </Text>
              {job.durationLabel ? <Text>{job.durationLabel}</Text> : null}
            </View>
            {job.summary ? (
              <Text style={styles.paragraph}>{job.summary}</Text>
            ) : null}
            {job.bullets.map((bullet, i) => (
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text>{bullet}</Text>
              </View>
            ))}
          </View>
        ))}

        {view.projects.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Proyectos Destacados</Text>
            {view.projects.map((p, i) => (
              <View key={i} style={styles.jobEntry}>
                <Text style={styles.jobTitle}>
                  {p.name}
                  {p.role ? ` — ${p.role}` : ""}
                </Text>
                {p.description ? (
                  <Text style={styles.paragraph}>{p.description}</Text>
                ) : null}
                {p.highlights.map((h, hi) => (
                  <View key={hi} style={styles.bullet}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text>{h}</Text>
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
              <View key={i} style={styles.bullet}>
                <Text style={styles.bulletMark}>•</Text>
                <Text>{item}</Text>
              </View>
            ))}
          </>
        ) : null}

        <Text style={styles.sectionTitle}>Formación y Certificaciones</Text>
        {education.map((ed, i) => (
          <Text key={i} style={styles.bullet}>
            <Text style={styles.bulletMark}>•</Text>
            <Text>
              {ed.title} — {ed.institution}
              {ed.detail ? ` (${ed.detail})` : ""}
            </Text>
          </Text>
        ))}

        <Text style={styles.sectionTitle}>Idiomas</Text>
        {languages.map((lang, i) => (
          <Text key={i} style={styles.bullet}>
            <Text style={styles.bulletMark}>•</Text>
            <Text>
              {lang.name}: {lang.level}
            </Text>
          </Text>
        ))}
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
