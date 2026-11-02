import { useId, useState } from "react";
import { BEGINNER_PRESETS, LANGUAGES, isValidProject } from "../search";
import Icon from "./Icon";

const MAX_LANGUAGE_MATCHES = 3;

// Suggestions are worked out here from what's typed, so showing them never
// uses up GitHub's search limit. Only choosing one runs a search.
function buildSuggestions(text) {
  const typed = text.trim();
  const lower = typed.toLowerCase();
  const matching = [];

  if (typed) {
    matching.push({ id: "search", type: "search", icon: "search", label: `Search for “${typed}”` });

    LANGUAGES.filter((language) => language.toLowerCase().includes(lower))
      .slice(0, MAX_LANGUAGE_MATCHES)
      .forEach((language) =>
        matching.push({
          id: `language-${language}`,
          type: "language",
          value: language,
          icon: "code",
          label: `${language} issues`,
          hint: "Language",
        }),
      );

    if (isValidProject(typed)) {
      const isRepo = typed.includes("/");
      matching.push({
        id: "project",
        type: "project",
        value: typed,
        icon: "repo",
        label: isRepo ? typed : `Projects by ${typed}`,
        hint: isRepo ? "Project" : "Organisation",
      });
    }
  }

  const beginner = [
    ...BEGINNER_PRESETS.map((preset) => ({
      id: `preset-${preset.id}`,
      type: "preset",
      value: preset,
      icon: preset.icon,
      label: preset.name,
    })),
    {
      id: "projects",
      type: "projects",
      icon: "heart",
      label: "Projects that welcome beginners",
    },
  ];

  return [
    { name: "Matching", items: matching },
    { name: "Beginner friendly", items: beginner },
  ].filter((group) => group.items.length > 0);
}

function SearchBar({
  text,
  onTextChange,
  onSubmit,
  onPickLanguage,
  onPickProject,
  onPreset,
  onShowProjects,
  filtersCount,
  filtersOpen,
  filtersPanelId,
  onToggleFilters,
}) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const listId = useId();
  const optionId = (index) => `${listId}-option-${index}`;

  // One flat, numbered list (for the arrow keys), each item knowing its group.
  const items = buildSuggestions(text)
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.name })))
    .map((item, index) => ({ ...item, index }));
  const groupNames = [...new Set(items.map((item) => item.group))];

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const choose = (item) => {
    close();
    if (item.type === "search") onSubmit(text);
    if (item.type === "language") onPickLanguage(item.value);
    if (item.type === "project") onPickProject(item.value);
    if (item.type === "preset") onPreset(item.value);
    if (item.type === "projects") onShowProjects();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        if (index === -1) return step === 1 ? 0 : items.length - 1;
        return (index + step + items.length) % items.length;
      });
    } else if (event.key === "Escape") {
      close();
    } else if (event.key === "Enter" && open && activeIndex >= 0) {
      event.preventDefault();
      choose(items[activeIndex]);
    }
  };

  return (
    <div className="searchbar">
      <form
        className="searchbar-row"
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          close();
          onSubmit(text);
        }}
      >
        <div className="searchbar-field">
          <Icon name="search" />
          <input
            id="issue-search"
            type="search"
            placeholder="Search issues on GitHub"
            aria-label="Search issues on GitHub"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={
              open && activeIndex >= 0 ? optionId(activeIndex) : undefined
            }
            autoComplete="off"
            value={text}
            onChange={(event) => {
              onTextChange(event.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => setOpen(true)}
            onBlur={close}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          type="button"
          className="filters-button"
          aria-expanded={filtersOpen}
          aria-controls={filtersPanelId}
          onClick={onToggleFilters}
        >
          <Icon name="filter" />
          Filters
          {filtersCount > 0 && (
            <span className="filters-count" aria-label={`${filtersCount} active`}>
              {filtersCount}
            </span>
          )}
        </button>
      </form>

      {open && (
        <div className="suggestions" id={listId} role="listbox" aria-label="Suggestions">
          {groupNames.map((groupName) => (
            <div key={groupName} role="group" aria-label={groupName}>
              <div className="suggestions-heading" aria-hidden="true">
                {groupName}
              </div>
              {items
                .filter((item) => item.group === groupName)
                .map((item) => (
                  <div
                    key={item.id}
                    id={optionId(item.index)}
                    role="option"
                    aria-selected={item.index === activeIndex}
                    className={`suggestion${item.index === activeIndex ? " suggestion-active" : ""}`}
                    // mousedown, not click: it fires before the input loses
                    // focus, so the list is still there to be clicked.
                    onMouseDown={(event) => {
                      event.preventDefault();
                      choose(item);
                    }}
                    onMouseEnter={() => setActiveIndex(item.index)}
                  >
                    <Icon name={item.icon} />
                    <span className="suggestion-label">{item.label}</span>
                    {item.hint && <span className="suggestion-hint">{item.hint}</span>}
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SearchBar;
