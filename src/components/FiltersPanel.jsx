import { useEffect, useId, useRef, useState } from "react";
import {
  COMMENT_OPTIONS,
  DEFAULT_FILTERS,
  LABELS,
  LANGUAGES,
  SORT_OPTIONS,
  UPDATED_OPTIONS,
  isValidProject,
} from "../search";

// Mounted only while open, so it always starts from the current filters.
// Changes stay a draft until "Show results", so trying options out doesn't
// spend GitHub searches. "Reset" is the exception: it applies straight away,
// since that's what people expect it to do.
function FiltersPanel({ id, filters, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const panelRef = useRef(null);
  const projectId = useId();
  const languageId = useId();
  const sortId = useId();
  const projectHintId = useId();

  useEffect(() => {
    panelRef.current?.querySelector("input, select")?.focus();
  }, []);

  const update = (changes) => setDraft((current) => ({ ...current, ...changes }));
  const project = draft.project.trim();
  const projectValid = project === "" || isValidProject(project);

  const toggleLabel = (key) =>
    update({
      labels: draft.labels.includes(key)
        ? draft.labels.filter((label) => label !== key)
        : [...draft.labels, key],
    });

  const radios = (name, options, value) =>
    Object.entries(options).map(([key, label]) => (
      <label key={key} className="filter-option">
        <input
          type="radio"
          name={`${id}-${name}`}
          checked={value === key}
          onChange={() => update({ [name]: key })}
        />
        {label}
      </label>
    ));

  return (
    <section
      ref={panelRef}
      id={id}
      className="filters-panel"
      aria-label="Filters"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div className="filters-panel-header">
        <h2>Filters</h2>
        <button
          type="button"
          className="text-button"
          onClick={() => onApply(DEFAULT_FILTERS)}
        >
          Reset
        </button>
      </div>

      <div className="filters-grid">
        <fieldset className="filter-group">
          <legend>Type of issue</legend>
          {Object.entries(LABELS).map(([key, { name }]) => (
            <label key={key} className="filter-option">
              <input
                type="checkbox"
                checked={draft.labels.includes(key)}
                onChange={() => toggleLabel(key)}
              />
              {name}
            </label>
          ))}
        </fieldset>

        <div>
          <fieldset className="filter-group">
            <legend>Availability</legend>
            <label className="filter-option">
              <input
                type="checkbox"
                checked={draft.notTaken}
                onChange={(event) => update({ notTaken: event.target.checked })}
              />
              Not taken yet
            </label>
            <label className="filter-option">
              <input
                type="checkbox"
                checked={draft.noPullRequest}
                onChange={(event) => update({ noPullRequest: event.target.checked })}
              />
              No pull request yet
            </label>
          </fieldset>
          <fieldset className="filter-group">
            <legend>Comments</legend>
            {radios("comments", COMMENT_OPTIONS, draft.comments)}
          </fieldset>
        </div>

        <fieldset className="filter-group">
          <legend>Last updated</legend>
          {radios("updated", UPDATED_OPTIONS, draft.updated)}
        </fieldset>

        <div className="filter-group">
          <label className="filter-label" htmlFor={languageId}>
            Language
          </label>
          <select
            id={languageId}
            className="filter-select"
            value={draft.language}
            onChange={(event) => update({ language: event.target.value })}
          >
            <option value="">Any language</option>
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>

          <label className="filter-label" htmlFor={projectId}>
            Project or organisation
          </label>
          <input
            id={projectId}
            className="filter-input"
            type="text"
            placeholder="e.g. vercel or vercel/next.js"
            value={draft.project}
            aria-invalid={!projectValid}
            aria-describedby={projectHintId}
            onChange={(event) => update({ project: event.target.value })}
          />
          <p
            id={projectHintId}
            className={`filter-hint${projectValid ? "" : " filter-hint-error"}`}
          >
            {projectValid
              ? "Leave empty to search every project."
              : "Use a name like vercel or vercel/next.js."}
          </p>

          <label className="filter-label" htmlFor={sortId}>
            Sort by
          </label>
          <select
            id={sortId}
            className="filter-select"
            value={draft.sort}
            onChange={(event) => update({ sort: event.target.value })}
          >
            {Object.entries(SORT_OPTIONS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="filters-panel-footer">
        <button type="button" className="secondary-button" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!projectValid}
          onClick={() => onApply({ ...draft, project })}
        >
          Show results
        </button>
      </div>
    </section>
  );
}

export default FiltersPanel;
