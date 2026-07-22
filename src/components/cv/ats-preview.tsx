import type { CvDocument } from "@/lib/cv/schema";
import { toAtsView } from "@/lib/cv/ats-view";

/** Preview ATS alineado a tipografía/márgenes del PDF seleccionable. */
export function AtsPreview({ data }: { data: CvDocument }) {
  const view = toAtsView(data);
  const { basics, profile, skillGroups, experience, education, languages } =
    view;
  const links = [
    basics.links.linkedin ? `LinkedIn: ${basics.links.linkedin}` : null,
    basics.links.github ? `GitHub: ${basics.links.github}` : null,
    basics.links.portfolio ? basics.links.portfolio : null,
  ].filter(Boolean);
  const contact = [basics.location, basics.phone, basics.email]
    .filter(Boolean)
    .join(" | ");

  return (
    <article className="ats-preview mx-auto w-full max-w-[210mm] bg-white text-[#1e293b] shadow-sm">
      <style>{`
        .ats-preview {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 10.5pt;
          line-height: 1.2;
          color: #1e293b;
          padding: 25.4mm;
          box-sizing: border-box;
        }
        .ats-preview .ats-header { text-align: center; margin-bottom: 14px; }
        .ats-preview h1 {
          font-size: 20pt; color: #0f172a; margin: 0 0 6px 0;
          font-weight: bold;
        }
        .ats-preview .ats-title-sub {
          font-size: 11.5pt; font-weight: normal; color: #334155; margin: 0 0 6px 0;
        }
        .ats-preview .ats-contact {
          font-size: 10pt; color: #475569; line-height: 1.2;
        }
        .ats-preview h2 {
          font-size: 13pt; color: #0f172a; text-transform: uppercase;
          letter-spacing: 0.6px; border-bottom: 1px solid #cbd5e1;
          padding-bottom: 3px; margin: 14px 0 6px 0; font-weight: bold;
        }
        .ats-preview h2.ats-h2-compact {
          margin: 10px 0 4px 0;
          font-size: 13pt;
        }
        .ats-preview p { margin: 0 0 6px 0; text-align: justify; }
        .ats-preview .ats-skills-block {
          font-size: 10pt;
          line-height: 1.2;
          color: #334155;
        }
        .ats-preview .ats-skills-group { margin-bottom: 2px; }
        .ats-preview .ats-skills-label { font-weight: bold; color: #0f172a; }
        .ats-preview .ats-competencies {
          font-size: 10pt;
          line-height: 1.2;
          margin: 0 0 4px 0;
          color: #334155;
        }
        .ats-preview .ats-job-entry { margin-bottom: 10px; }
        .ats-preview .ats-job-title {
          font-size: 11.5pt; font-weight: bold; color: #0f172a; margin: 0 0 2px 0;
        }
        .ats-preview .ats-job-sub {
          color: #334155; font-size: 11pt; margin: 0 0 2px 0;
        }
        .ats-preview .ats-job-meta {
          font-size: 10pt; color: #475569; margin: 0 0 4px 0;
        }
        .ats-preview ul {
          margin: 0 0 8px 0;
          padding-left: 1.1em;
          list-style-type: disc;
        }
        .ats-preview li {
          margin-bottom: 3px;
          text-align: justify;
        }
      `}</style>

      <div className="ats-header">
        <h1>{basics.fullName}</h1>
        <div className="ats-title-sub">{basics.headline}</div>
        <div className="ats-contact">
          {contact}
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
        const period = [job.start, job.end].filter(Boolean).join(" - ");
        const meta = [period, job.durationLabel].filter(Boolean).join(" | ");
        return (
          <div key={`${job.company}-${job.start}-${idx}`} className="ats-job-entry">
            <div className="ats-job-title">{job.title}</div>
            <div className="ats-job-sub">
              {job.company}
              {job.location ? ` - ${job.location}` : ""}
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
                {p.role ? ` - ${p.role}` : ""}
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
        const period = [ed.start, ed.end].filter(Boolean).join(" - ");
        const meta = [period, ed.detail].filter(Boolean).join(" | ");
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
          <p className="ats-competencies">{view.coreCompetencies.join(" | ")}</p>
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
