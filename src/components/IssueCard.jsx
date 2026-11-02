import { previewText } from "../preview";
import Icon from "./Icon";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const starFormat = new Intl.NumberFormat(undefined, { notation: "compact" });

function IssueCard({
  title,
  description,
  label,
  language,
  repo,
  url,
  comments,
  updatedAt,
  saved,
  onToggleSave,
  project,
}) {
  const preview = previewText(description);
  const details = [
    typeof comments === "number" &&
      (comments === 1 ? "1 comment" : `${comments} comments`),
    updatedAt && `updated ${dateFormat.format(new Date(updatedAt))}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="issue-card">
      <div className="issue-card-header">
        <div className="issue-card-labels">
          <span className="issue-label">{label}</span>
          {project?.archived ? (
            <span className="project-warning project-warning-archived">
              Archived project
            </span>
          ) : (
            project?.quiet && (
              <span className="project-warning">Quiet for 6+ months</span>
            )
          )}
        </div>
        <div className="issue-card-meta">
          {language && <span className="issue-language">{language}</span>}
          {onToggleSave && (
            <button
              type="button"
              className={`icon-button issue-save${saved ? " issue-save-active" : ""}`}
              aria-pressed={saved}
              aria-label={saved ? `Remove "${title}" from saved` : `Save "${title}"`}
              title={saved ? "Remove from saved" : "Save issue"}
              onClick={onToggleSave}
            >
              <Icon name={saved ? "bookmarkFilled" : "bookmark"} />
            </button>
          )}
        </div>
      </div>

      <h2>{title}</h2>

      <p className="issue-description">{preview}</p>

      <div className="issue-card-footer">
        <span className="issue-card-details">
          {repo}
          {typeof project?.stars === "number" && (
            <span
              className="issue-stars"
              aria-label={`${project.stars.toLocaleString()} stars`}
            >
              <Icon name="star" />
              {starFormat.format(project.stars)}
            </span>
          )}
          {details && ` · ${details}`}
        </span>
        <span className="issue-card-links">
          {project?.contributingUrl && (
            <a href={project.contributingUrl} target="_blank" rel="noopener noreferrer">
              Contributing guide ↗
            </a>
          )}
          <a href={url} target="_blank" rel="noopener noreferrer">
            View issue ↗
          </a>
        </span>
      </div>
    </article>
  );
}

export default IssueCard;
