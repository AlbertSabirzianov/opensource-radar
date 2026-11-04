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
import { INDIAN_LANGUAGE_CODES, SPOKEN_LANGUAGES } from "../spokenLanguages";

const languageOption = ({ code, name, native }) => (
  <option key={code} value={code}>
    {native ? `${name} (${native})` : name}
  </option>
);

const INDIAN_LANGUAGES = SPOKEN_LANGUAGES.filter(({ code }) =>
  INDIAN_LANGUAGE_CODES.includes(code),
);

// Mounted only while open, so it always starts from the current filters.
// Changes stay a draft until "Show results", so trying options out doesn't
// spend GitHub searches. "Reset" is the exception: it applies straight away,
// since that's what people expect it to do.
function FiltersPanel({ id, filters, onApply, onClose }) {
  const [draft, setDraft] = useState(filters);
  const panelRef = useRef(null);
  const projectId = useId();
  const languageId = useId();
  const regionalId = useId();
  const sortId = useId();
  const projectHintId = useId();
  const popularHintId = useId();

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

      {/* Top row: where to look. The dropdowns sit side by side. */}
      <div className="filters-top">
        <div className="filter-field">
          <label className="filter-label" htmlFor={languageId}>
            Programming language
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
        </div>

        <div className="filter-field">
          <label className="filter-label" htmlFor={regionalId}>
            Regional language
          </label>
          <select
            id={regionalId}
            className="filter-select"
            value={draft.regional}
            onChange={(event) => update({ regional: event.target.value })}
          >
            <option value="">Any language</option>
            <optgroup label="Indian languages">{INDIAN_LANGUAGES.map(languageOption)}</optgroup>
            <optgroup label="All languages">{SPOKEN_LANGUAGES.map(languageOption)}</optgroup>
          </select>
        </div>

        <div className="filter-field">
          <label className="filter-label" htmlFor={projectId}>
            Project or organisation
          </label>
          <input
            id={projectId}
            className="filter-input"
            type="text"
            placeholder="e.g. vercel/next.js"
            value={draft.project}
            aria-invalid={!projectValid}
            aria-describedby={projectValid ? undefined : projectHintId}
            onChange={(event) => update({ project: event.target.value })}
          />
          {!projectValid && (
            <p id={projectHintId} className="filter-hint filter-hint-error">
              Use a name like vercel or vercel/next.js.
            </p>
          )}
        </div>

        <div className="filter-field">
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

      <div className="filter-popular-row">
        <label className="filter-option filter-popular">
          <input
            type="checkbox"
            checked={draft.popular && !project}
            disabled={Boolean(project)}
            aria-describedby={popularHintId}
            onChange={(event) => update({ popular: event.target.checked })}
          />
          Popular, active projects only
        </label>
        <p id={popularHintId} className="filter-hint">
          {project
            ? "Not used when a project is chosen above."
            : "1,000+ stars and updated in the last month."}
        </p>
      </div>

      {/* Bottom row: which issues. Four short groups of similar height. */}
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

        <fieldset className="filter-group">
          <legend>Last updated</legend>
          {radios("updated", UPDATED_OPTIONS, draft.updated)}
        </fieldset>
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
