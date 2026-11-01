import { useEffect, useId, useRef, useState } from "react";
import { githubUrl } from "../github";
import Icon from "./Icon";

const PULL_REQUEST_LIMIT = 30;

const STATUS = {
  open: { label: "Open", icon: "gitPullRequest" },
  draft: { label: "Draft", icon: "gitPullRequestDraft" },
  merged: { label: "Merged", icon: "gitMerge" },
  closed: { label: "Closed", icon: "gitPullRequestClosed" },
};

function statusOf(pullRequest) {
  if (pullRequest.pull_request?.merged_at) return "merged";
  if (pullRequest.state === "closed") return "closed";
  return pullRequest.draft ? "draft" : "open";
}

// Mounted only while open (NavMenu renders it on demand), so each opening
// starts fresh and fetches the latest pull requests.
function ContributionsDialog({ login, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [result, setResult] = useState({ status: "loading", items: [], total: 0 });

  useEffect(() => {
    if (!dialogRef.current.open) {
      dialogRef.current.showModal();
    }

    let cancelled = false;
    const query = encodeURIComponent(`type:pr author:${login}`);

    fetch(
      githubUrl(
        `/search/issues?q=${query}&sort=updated&order=desc&per_page=${PULL_REQUEST_LIMIT}`,
        true,
      ),
    )
      .then((response) =>
        response.ok ? response.json() : Promise.reject(response),
      )
      .then((data) => {
        if (!cancelled) {
          setResult({
            status: "ready",
            items: data.items ?? [],
            total: data.total_count ?? 0,
          });
        }
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", items: [], total: 0 });
      });

    return () => {
      cancelled = true;
    };
  }, [login]);

  const counts = result.items.reduce((totals, pullRequest) => {
    const status = statusOf(pullRequest);
    return { ...totals, [status]: (totals[status] || 0) + 1 };
  }, {});

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog contributions-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
      onClose={onClose}
    >
      <div className="about-header">
        <h2 id={titleId}>My contributions</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="about-body">
        {result.status === "loading" && <p>Loading your pull requests...</p>}

        {result.status === "error" && (
          <p>Couldn&rsquo;t load your pull requests. Try again in a moment.</p>
        )}

        {result.status === "ready" && result.items.length === 0 && (
          <p>
            You haven&rsquo;t opened a pull request yet. Pick an issue from the
            list and make your first one!
          </p>
        )}

        {result.status === "ready" && result.items.length > 0 && (
          <>
            <p className="contributions-summary">
              {Object.entries(STATUS)
                .filter(([status]) => counts[status])
                .map(([status, { label }]) => (
                  <span key={status} className={`pr-count pr-${status}`}>
                    <Icon name={STATUS[status].icon} />
                    {counts[status]} {label.toLowerCase()}
                  </span>
                ))}
            </p>

            <ul className="pr-list">
              {result.items.map((pullRequest) => {
                const status = statusOf(pullRequest);
                const repo = pullRequest.repository_url.split("/repos/")[1];

                return (
                  <li key={pullRequest.id} className="pr-item">
                    <span
                      className={`pr-icon pr-${status}`}
                      title={STATUS[status].label}
                    >
                      <Icon name={STATUS[status].icon} />
                    </span>
                    <div className="pr-text">
                      <a
                        href={pullRequest.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {pullRequest.title}
                      </a>
                      <span className="pr-meta">
                        <span className="sr-only">{STATUS[status].label}: </span>
                        {repo} #{pullRequest.number} · updated{" "}
                        {new Date(pullRequest.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {result.status === "ready" && result.total > 0 && (
          <p className="contributions-footer">
            {result.total > result.items.length
              ? `Showing your ${result.items.length} most recent of ${result.total}. `
              : ""}
            <a
              href={`https://github.com/pulls?q=${encodeURIComponent(`is:pr author:${login}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View all on GitHub
            </a>
          </p>
        )}
      </div>
    </dialog>
  );
}

export default ContributionsDialog;
