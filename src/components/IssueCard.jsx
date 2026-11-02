import { previewText } from "../preview";
import Icon from "./Icon";

const dateFormat = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "short",
  year: "numeric",
});

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
}) {
  const preview = previewText(description);
  const details = [
    repo,
    typeof comments === "number" &&
      (comments === 1 ? "1 comment" : `${comments} comments`),
    updatedAt && `updated ${dateFormat.format(new Date(updatedAt))}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <article className="issue-card">
      <div className="issue-card-header">
        <span className="issue-label">{label}</span>
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
        <span>{details}</span>
        <a href={url} target="_blank" rel="noopener noreferrer">
          View issue ↗
        </a>
      </div>
    </article>
  );
}

export default IssueCard;
