import type { CvDocument } from "@/lib/cv/schema";
import { toAtsView } from "@/lib/cv/ats-view";

/** Preview ATS fiel a la plantilla HTML (A4, una columna) desde perfil maestro. */
export function AtsPreview({ data }: { data: CvDocument }) {
  const view = toAtsView(data);
  const { basics, profile, skillGroups, experience, education, languages } =
    view;
  const links = [
    basics.links.linkedin ? `LinkedIn: ${basics.links.linkedin}` : null,
    basics.links.github ? `GitHub: ${basics.links.github}` : null,
    basics.links.portfolio ? basics.links.portfolio : null,
  ].filter(Boolean);

  return (
    <article className="ats-preview mx-auto w-full max-w-[210mm] bg-white text-[#1e293b] shadow-sm">
      <style>{`
        .ats-preview {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10.5pt;
          line-height: 1.5;
          color: #1e293b;
          padding: 20mm 15mm;
          box-sizing: border-box;
        }
        .ats-preview .ats-header { text-align: center; margin-bottom: 25px; }
        .ats-preview h1 {
          font-size: 20pt; color: #0f172a; margin: 0 0 10px 0;
          font-weight: bold; letter-spacing: -0.5px;
        }
        .ats-preview .ats-title-sub {
          font-size: 13pt; font-weight: normal; color: #475569; margin: 0 0 12px 0;
        }
        .ats-preview .ats-contact {
          font-size: 9.5pt; color: #475569; line-height: 1.6;
        }
        .ats-preview h2 {
          font-size: 11pt; color: #0f172a; text-transform: uppercase;
          letter-spacing: 0.5px; border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px; margin: 14px 0 8px 0;
        }
        .ats-preview h2.ats-h2-compact {
          margin: 10px 0 4px 0;
          font-size: 10pt;
        }
        .ats-preview p { margin: 0 0 8px 0; text-align: justify; }
        .ats-preview .ats-skills-block {
          font-size: 9pt;
          line-height: 1.35;
          color: #334155;
        }
        .ats-preview .ats-skills-group { margin-bottom: 2px; }
        .ats-preview .ats-skills-label { font-weight: bold; color: #0f172a; }
        .ats-preview .ats-competencies {
          font-size: 9pt;
          line-height: 1.35;
          margin: 0 0 4px 0;
        }
        .ats-preview .ats-job-entry { margin-bottom: 10px; }
        .ats-preview .ats-job-title {
          font-size: 11pt; font-weight: bold; color: #0f172a; margin: 0 0 2px 0;
        }
        .ats-preview .ats-job-sub {
          font-style: italic; color: #475569; font-size: 10pt; margin: 0 0 2px 0;
        }
        .ats-preview .ats-job-meta {
          font-size: 9.5pt; color: #475569; margin: 0 0 6px 0;
        }
        .ats-preview ul { margin: 0 0 10px 0; padding-left: 20px; }
        .ats-preview li { margin-bottom: 4px; text-align: justify; }
      `}</style>

      <div className="ats-header">
        <h1>{basics.fullName}</h1>
        <div className="ats-title-sub">{basics.headline}</div>
        <div className="ats-contact">
          {basics.location} &nbsp;|&nbsp; {basics.phone} &nbsp;|&nbsp;{" "}
          {basics.email}
          {basics.availability ? (
            <>
              <br />
              {basics.availability}
            </>
          ) : null}
          {links.length > 0 ? (
            <>
              <br />
              {links.join(" | ")}
            </>
          ) : null}
        </div>
      </div>

      <h2>Perfil Profesional</h2>
      <p>{profile}</p>

      <h2>Experiencia Profesional</h2>
      {experience.map((job, idx) => {
        const period = [job.start, job.end].filter(Boolean).join(" – ");
        const meta = [period, job.durationLabel].filter(Boolean).join(" · ");
        return (
          <div key={`${job.company}-${job.start}-${idx}`} className="ats-job-entry">
            <div className="ats-job-title">{job.title}</div>
            <div className="ats-job-sub">
              {job.company}
              {job.location ? ` — ${job.location}` : ""}
            </div>
            {meta ? <div className="ats-job-meta">{meta}</div> : null}
            {job.summary ? <p>{job.summary}</p> : null}
            {job.bullets.length > 0 ? (
              <ul>
                {job.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}

      {view.projects.length > 0 ? (
        <>
          <h2>Proyectos Destacados</h2>
          {view.projects.map((p, i) => (
            <div key={i} className="ats-job-entry">
              <div className="ats-job-title">
                {p.name}
                {p.role ? ` — ${p.role}` : ""}
              </div>
              {p.description ? <p>{p.description}</p> : null}
              {p.highlights.length > 0 ? (
                <ul>
                  {p.highlights.map((h, hi) => (
                    <li key={hi}>{h}</li>
                  ))}
                </ul>
              ) : null}
              {p.technologies.length > 0 ? (
                <p>
                  <span className="ats-skills-label">Tech:</span>{" "}
                  {p.technologies.join(", ")}
                </p>
              ) : null}
            </div>
          ))}
        </>
      ) : null}

      {view.leadership.length > 0 ? (
        <>
          <h2>Liderazgo y Colaboración</h2>
          <ul>
            {view.leadership.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>Formación y Certificaciones</h2>
      {education.map((ed, i) => {
        const period = [ed.start, ed.end].filter(Boolean).join(" – ");
        const meta = [period, ed.detail].filter(Boolean).join(" · ");
        return (
          <div key={i} className="ats-job-entry">
            <div className="ats-job-title">{ed.title}</div>
            <div className="ats-job-sub">{ed.institution}</div>
            {meta ? <div className="ats-job-meta">{meta}</div> : null}
          </div>
        );
      })}

      <h2>Idiomas</h2>
      <ul>
        {languages.map((lang, i) => (
          <li key={i}>
            <strong>{lang.name}:</strong> {lang.level}
          </li>
        ))}
      </ul>

      {view.coreCompetencies.length > 0 ? (
        <>
          <h2 className="ats-h2-compact">Competencias Clave</h2>
          <p className="ats-competencies">{view.coreCompetencies.join(" · ")}</p>
        </>
      ) : null}

      {skillGroups.length > 0 ? (
        <>
          <h2 className="ats-h2-compact">Habilidades Técnicas</h2>
          <div className="ats-skills-block">
            {skillGroups.map((group) => (
              <div key={group.label} className="ats-skills-group">
                <span className="ats-skills-label">{group.label}:</span>{" "}
                {group.items.join(", ")}.
              </div>
            ))}
          </div>
        </>
      ) : null}
    </article>
  );
}
