import { useEffect, useId, useRef, useState } from "react";
import { githubUrl } from "../github";
import Icon from "./Icon";

const PROJECT_COUNT = 12;
const MIN_BEGINNER_ISSUES = 10;
const ACTIVE_WITHIN_DAYS = 30;

function welcomingProjectsPath(language) {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - ACTIVE_WITHIN_DAYS);
  // GitHub can search repositories by how many open "good first issue"
  // issues they have; recently pushed means someone is still maintaining it.
  const query = [
    `good-first-issues:>${MIN_BEGINNER_ISSUES}`,
    "archived:false",
    `pushed:>=${since.toISOString().slice(0, 10)}`,
    language ? `language:"${language}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${PROJECT_COUNT}`;
}

// Mounted only while open (App renders it on demand).
function ProjectsDialog({ language, signedIn, onPickProject, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const [result, setResult] = useState({ status: "loading", items: [] });

  useEffect(() => {
    if (!dialogRef.current.open) {
      dialogRef.current.showModal();
    }

    let cancelled = false;
    fetch(githubUrl(welcomingProjectsPath(language), signedIn))
      .then((response) => (response.ok ? response.json() : Promise.reject(response)))
      .then((data) => {
        if (!cancelled) setResult({ status: "ready", items: data.items ?? [] });
      })
      .catch(() => {
        if (!cancelled) setResult({ status: "error", items: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [language, signedIn]);

  // Closing from a button tells App straight away instead of waiting for the
  // dialog's "close" event, which some browsers delay in background windows.
  // (Esc still closes through the event.)
  const closeDialog = () => {
    dialogRef.current?.close();
    onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog projects-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === dialogRef.current) closeDialog();
      }}
      onClose={onClose}
    >
      <div className="about-header">
        <h2 id={titleId}>Projects that welcome beginners</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={closeDialog}
        >
          <Icon name="x" />
        </button>
      </div>

      <div className="about-body">
        <p className="projects-intro">
          Active projects with more than {MIN_BEGINNER_ISSUES} open
          &ldquo;good first issues&rdquo;
          {language ? ` in ${language}` : ""}.
        </p>

        {result.status === "loading" && <p>Finding projects...</p>}
        {result.status === "error" && (
          <p>Couldn&rsquo;t load projects right now. Try again in a minute.</p>
        )}
        {result.status === "ready" && result.items.length === 0 && (
          <p>No projects found{language ? ` for ${language}` : ""}.</p>
        )}

        {result.items.length > 0 && (
          <ul className="project-list">
            {result.items.map((repo) => (
              <li key={repo.id} className="project-item">
                <div className="project-text">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                    {repo.full_name}
                  </a>
                  {repo.description && (
                    <p className="project-description">{repo.description}</p>
                  )}
                  <span className="project-meta">
                    <Icon name="star" />
                    {repo.stargazers_count.toLocaleString()}
                    {repo.language ? ` · ${repo.language}` : ""}
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    onPickProject(repo.full_name);
                    closeDialog();
                  }}
                >
                  Show issues
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

export default ProjectsDialog;
