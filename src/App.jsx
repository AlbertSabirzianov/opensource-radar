import { useEffect, useId, useRef, useState } from "react";
import FiltersPanel from "./components/FiltersPanel";
import Icon from "./components/Icon";
import IssueCard from "./components/IssueCard";
import NavMenu from "./components/NavMenu";
import ProjectsDialog from "./components/ProjectsDialog";
import SearchBar from "./components/SearchBar";
import { githubUrl } from "./github";
import {
  DEFAULT_FILTERS,
  MAX_RESULTS,
  PER_PAGE,
  SORT_OPTIONS,
  activeFilterChips,
  countActiveFilters,
  searchPath,
  stateFromUrl,
  stateToUrl,
  toIssue,
} from "./search";
import "./App.css";

const THEME_KEY = "opensource-radar-theme";
// Issues used to be cached here before search covered all of GitHub.
const OLD_ISSUES_CACHE_KEY = "opensource-radar-issues-v11";
const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const SAVED_KEY_PREFIX = "opensource-radar-saved-";
const SYNCED_KEY_PREFIX = "opensource-radar-saved-synced-";
const SAVED_DESCRIPTION_LENGTH = 1000;
const RECOMMENDED_LANGUAGE_COUNT = 5;
const SEARCH_CACHE_TIME = 5 * 60 * 1000;
const NO_FILTERS = {
  ...DEFAULT_FILTERS,
  labels: [],
  notTaken: false,
};

// Recent results, so paging back or repeating a search doesn't spend one of
// GitHub's limited searches.
const searchCache = new Map();

// Saved issues live in this browser, one list per GitHub account, so two
// people sharing a computer don't see each other's.
function readSavedIssues(login) {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_KEY_PREFIX + login));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeSavedIssues(login, savedIssues) {
  try {
    localStorage.setItem(SAVED_KEY_PREFIX + login, JSON.stringify(savedIssues));
  } catch {
    // Storage full or blocked; the list still works until the page reloads.
  }
}

async function requestSaved(init) {
  const response = await fetch("/api/saved", init);
  if (!response.ok) throw new Error(`Saved issues request failed (${response.status})`);
  return (await response.json()).items;
}

const putSavedIssues = (items) =>
  requestSaved({
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });

// Brings this browser's saved list in line with the account's list in the
// database. The first time on each device, anything saved here before sync
// existed is merged in; after that the account's list wins, so an issue
// removed on one device doesn't come back from another device's copy.
async function syncSavedIssues(login, localIssues) {
  const remote = await requestSaved();
  const syncedKey = SYNCED_KEY_PREFIX + login;
  let firstSync = true;
  try {
    firstSync = !localStorage.getItem(syncedKey);
  } catch {
    // Storage blocked: treat it as a first sync (merging is the safe choice).
  }

  let merged = remote;
  if (firstSync) {
    const remoteIds = new Set(remote.map((issue) => issue.id));
    const localOnly = localIssues.filter((issue) => !remoteIds.has(issue.id));
    if (localOnly.length > 0) {
      merged = await putSavedIssues(
        [...remote, ...localOnly].sort((a, b) => b.savedAt - a.savedAt),
      );
    }
    try {
      localStorage.setItem(syncedKey, "1");
    } catch {
      // Storage blocked; the next visit merges again, which is harmless.
    }
  }

  writeSavedIssues(login, merged);
  return merged;
}

// Keeps a copy of the issue so it stays in Saved even after it drops out of
// the latest results from GitHub.
function toSavedIssue(issue) {
  return {
    ...issue,
    description: issue.description.slice(0, SAVED_DESCRIPTION_LENGTH),
    savedAt: Date.now(),
  };
}

// Most-used languages across the user's own public repos (forks only count
// when there's nothing else, since beginners often start with forks).
function topLanguages(repos) {
  const list = Array.isArray(repos) ? repos : [];
  const own = list.filter((repo) => !repo.fork && repo.language);
  const counted = own.length > 0 ? own : list.filter((repo) => repo.language);

  const counts = new Map();
  counted.forEach((repo) =>
    counts.set(repo.language, (counts.get(repo.language) || 0) + 1),
  );

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, RECOMMENDED_LANGUAGE_COUNT)
    .map(([language]) => language);
}

function getInitialThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") {
      return saved;
    }
  } catch {
    // Storage unavailable; fall back to the system preference.
  }

  return "system";
}

function searchLimitMessage(response, signedIn, signInAvailable) {
  const reset = Number(response.headers.get("x-ratelimit-reset"));
  const seconds = reset ? Math.max(1, Math.ceil(reset - Date.now() / 1000)) : 0;
  const wait = seconds ? `Try again in ${seconds} seconds` : "Try again in a minute";

  if (signedIn) {
    return `GitHub allows 30 searches a minute. ${wait}.`;
  }
  return `GitHub allows 10 searches a minute without signing in. ${wait}${
    signInAvailable ? ", or sign in from the menu for more" : ""
  }.`;
}

function App() {
  const [themePreference, setThemePreference] = useState(
    getInitialThemePreference,
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(
    () => window.matchMedia?.(DARK_SCHEME_QUERY).matches ?? false,
  );
  const theme =
    themePreference === "system"
      ? systemPrefersDark
        ? "dark"
        : "light"
      : themePreference;

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.(DARK_SCHEME_QUERY);
    if (!mediaQuery) return undefined;

    const handleChange = (event) => setSystemPrefersDark(event.matches);
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const changeThemePreference = (preference) => {
    setThemePreference(preference);

    try {
      localStorage.setItem(THEME_KEY, preference);
    } catch {
      // Storage unavailable; the theme still applies for this visit.
    }
  };

  // Who's signed in, from the server (api/me.js). If the sign-in functions
  // aren't deployed or configured, the menu simply hides "Sign in".
  const [account, setAccount] = useState({
    user: null,
    signInAvailable: false,
    savedSync: false,
    reportsAvailable: false,
    checked: false,
  });
  // Bookmark changes are sent to the server one after another, so a quick
  // save-then-unsave can't arrive out of order and leave the wrong list.
  const savedQueue = useRef(Promise.resolve());
  const [signInFailed] = useState(
    () => new URLSearchParams(window.location.search).get("signin") === "failed",
  );
  const [savedIssues, setSavedIssues] = useState([]);
  const signedIn = Boolean(account.user);

  useEffect(() => {
    let cancelled = false;

    try {
      localStorage.removeItem(OLD_ISSUES_CACHE_KEY);
    } catch {
      // Nothing to clean up.
    }

    fetch("/api/me", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;

        const user = data?.user ?? null;
        const savedSync = Boolean(data?.savedSync);
        setAccount({
          user,
          signInAvailable: Boolean(data?.signInAvailable),
          savedSync,
          reportsAvailable: Boolean(data?.reportsAvailable),
          checked: true,
        });
        if (!user) return;

        const localIssues = readSavedIssues(user.login);
        setSavedIssues(localIssues);
        if (savedSync) {
          syncSavedIssues(user.login, localIssues)
            .then((synced) => {
              if (!cancelled) setSavedIssues(synced);
            })
            .catch(() => {
              // Database unreachable: keep this browser's copy for now.
            });
        }
      })
      .catch(() => {
        // Not available (e.g. a static preview); stay signed out.
        if (!cancelled) setAccount((current) => ({ ...current, checked: true }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // The search that's on screen: filters, words and page. It starts from
  // the address bar, so a shared link opens the same search.
  const [search, setSearch] = useState(() => stateFromUrl(window.location.search));
  const [inputText, setInputText] = useState(search.text);
  const [results, setResults] = useState({ status: "loading", items: [], total: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(false);
  const [recommendation, setRecommendation] = useState(null);
  // "search" or "saved": which list is shown.
  const [view, setView] = useState("search");
  const [savedPage, setSavedPage] = useState(1);
  const filtersPanelId = useId();
  const filtersButtonFocus = () =>
    document.querySelector(".filters-button")?.focus();

  const path = searchPath(search.filters, search.text, search.page);

  // Keep the address bar in step with the search (this also drops the
  // one-off "?signin=failed" once it has been read).
  useEffect(() => {
    window.history.replaceState(
      null,
      "",
      stateToUrl(search.filters, search.text, search.page),
    );
  }, [search]);

  useEffect(() => {
    // Wait until we know whether the visitor is signed in, so the search
    // goes through the right route (and their own limit) the first time.
    if (!account.checked || view === "saved") return undefined;

    let cancelled = false;
    const language = search.filters.language;

    async function runSearch() {
      const cached = searchCache.get(path);
      if (cached && Date.now() - cached.time < SEARCH_CACHE_TIME) {
        setResults({ status: "ready", ...cached.value });
        return;
      }

      setResults((current) => ({ ...current, status: "loading" }));
      try {
        const response = await fetch(githubUrl(path, signedIn));
        if (cancelled) return;

        if (signedIn && response.status === 401) {
          // Session expired: show the signed-out menu; this effect then
          // runs the search again the anonymous way.
          setAccount((current) => ({ ...current, user: null }));
          return;
        }
        if (response.status === 403 || response.status === 429) {
          setResults({
            status: "error",
            items: [],
            total: 0,
            message: searchLimitMessage(response, signedIn, account.signInAvailable),
          });
          return;
        }
        if (response.status === 422) {
          setResults({
            status: "error",
            items: [],
            total: 0,
            message:
              "GitHub couldn't understand this search. Check the words or a project name in Filters.",
          });
          return;
        }
        if (!response.ok) throw new Error(`Search failed (${response.status})`);

        const data = await response.json();
        if (cancelled) return;

        const value = {
          items: (data.items || []).map((item) => toIssue(item, language)),
          total: data.total_count || 0,
        };
        searchCache.set(path, { time: Date.now(), value });
        setResults({ status: "ready", ...value });
      } catch {
        if (!cancelled) {
          setResults({
            status: "error",
            items: [],
            total: 0,
            message: "Couldn't reach GitHub. Check your connection and try again.",
          });
        }
      }
    }

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [path, account.checked, signedIn, view, search.filters.language, account.signInAvailable]);

  const scrollToResults = () =>
    document
      .querySelector(".issues-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

  const runNewSearch = (changes) => {
    setSearch((current) => ({ ...current, ...changes, page: 1 }));
    setView("search");
    setFiltersOpen(false);
  };

  const applyFilters = (filters) => {
    setRecommendation(null);
    runNewSearch({ filters });
  };

  const submitText = (text) => {
    const words = text.trim();
    setInputText(words);
    runNewSearch({ text: words });
  };

  const pickFromSuggestions = (filterChanges) => {
    setInputText("");
    setRecommendation(null);
    runNewSearch({
      text: "",
      filters: { ...search.filters, ...filterChanges },
    });
  };

  const applyPreset = (preset) =>
    pickFromSuggestions({
      ...NO_FILTERS,
      ...preset.filters,
      language: search.filters.language,
      project: search.filters.project,
      sort: search.filters.sort,
    });

  const goToPage = (page) => {
    setSearch((current) => ({ ...current, page }));
    scrollToResults();
  };

  const toggleSaved = (issue) => {
    if (!account.user) return;

    const next = savedIssues.some((saved) => saved.id === issue.id)
      ? savedIssues.filter((saved) => saved.id !== issue.id)
      : [toSavedIssue(issue), ...savedIssues];
    setSavedIssues(next);
    writeSavedIssues(account.user.login, next);

    if (account.savedSync) {
      savedQueue.current = savedQueue.current
        .then(() => putSavedIssues(next))
        .catch(() => {
          // Kept in this browser; the next sign-in on a device reconciles.
        });
    }
  };

  const showSaved = () => {
    setView("saved");
    setSavedPage(1);
    scrollToResults();
  };

  // Beginner issues in the language the user codes in most (from their
  // public repositories), with their other languages one click away.
  const showRecommended = async () => {
    try {
      const response = await fetch(
        githubUrl("/user/repos?per_page=100&sort=pushed&affiliation=owner", true),
      );
      if (!response.ok) throw new Error("Couldn't read your repositories.");

      const languages = topLanguages(await response.json());
      setRecommendation({ languages });
      if (languages.length > 0) {
        setInputText("");
        runNewSearch({
          text: "",
          filters: {
            ...NO_FILTERS,
            labels: ["good-first-issue", "help-wanted"],
            notTaken: true,
            language: languages[0],
          },
        });
      } else {
        setView("search");
      }
    } catch {
      setRecommendation({ languages: [], error: true });
      setView("search");
    }
    scrollToResults();
  };

  const signOut = async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {
      // The local sign-out below still applies.
    }
    setAccount((current) => ({ ...current, user: null }));
    setSavedIssues([]);
    setRecommendation(null);
    setView("search");
  };

  const savedIds = new Set(savedIssues.map((issue) => issue.id));
  const chips = activeFilterChips(search.filters);
  const searchPages = Math.min(
    Math.ceil(results.total / PER_PAGE),
    MAX_RESULTS / PER_PAGE,
  );
  const savedPages = Math.ceil(savedIssues.length / PER_PAGE);
  const shownIssues =
    view === "saved"
      ? savedIssues.slice((savedPage - 1) * PER_PAGE, savedPage * PER_PAGE)
      : results.items;
  const page = view === "saved" ? savedPage : search.page;
  const totalPages = view === "saved" ? savedPages : searchPages;
  const setPage = view === "saved" ? setSavedPage : goToPage;

  let listMessage = "";
  if (view === "saved" && savedIssues.length === 0) {
    listMessage =
      "You haven't saved any issues yet. Use the bookmark on an issue to save it here.";
  } else if (view === "search" && results.status === "loading") {
    listMessage = "Searching GitHub...";
  } else if (view === "search" && results.status === "error") {
    listMessage = results.message;
  } else if (view === "search" && results.items.length === 0) {
    listMessage = "No issues match this search. Try removing a filter above.";
  }

  return (
    <main className="app">
      <nav className="navbar">
        <h2>OpenSource Radar</h2>
        <div className="nav-actions">
          <NavMenu
            themePreference={themePreference}
            onThemeChange={changeThemePreference}
            user={account.user}
            signInAvailable={account.signInAvailable}
            onSignOut={signOut}
            savedCount={savedIssues.length}
            onShowSaved={showSaved}
            onShowRecommended={showRecommended}
            reportsAvailable={account.reportsAvailable}
            theme={theme}
          />
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">YOUR OPEN-SOURCE JOURNEY STARTS HERE</p>
        <h1>Find your first open-source issue.</h1>
        <p className="description">Search open issues across all of GitHub.</p>

        <SearchBar
          text={inputText}
          onTextChange={setInputText}
          onSubmit={submitText}
          onPickLanguage={(language) => pickFromSuggestions({ language })}
          onPickProject={(project) => pickFromSuggestions({ project })}
          onPreset={applyPreset}
          onShowProjects={() => setProjectsOpen(true)}
          filtersCount={countActiveFilters(search.filters)}
          filtersOpen={filtersOpen}
          filtersPanelId={filtersPanelId}
          onToggleFilters={() => setFiltersOpen((open) => !open)}
        />

        {filtersOpen && (
          <FiltersPanel
            id={filtersPanelId}
            filters={search.filters}
            onApply={(filters) => {
              applyFilters(filters);
              filtersButtonFocus();
            }}
            onClose={() => {
              setFiltersOpen(false);
              filtersButtonFocus();
            }}
          />
        )}
      </section>

      <section className="issues-section" aria-live="polite">
        {view === "saved" ? (
          <>
            <div className="issues-header">
              <h2>Saved issues</h2>
              <button
                type="button"
                className="back-button"
                onClick={() => setView("search")}
              >
                <Icon name="arrowLeft" />
                Back to search
              </button>
            </div>
            {savedIssues.length > 0 && (
              <p className="view-note">
                {account.savedSync
                  ? `Synced to @${account.user?.login} on every device you sign in on.`
                  : `Saved in this browser for @${account.user?.login}.`}
              </p>
            )}
          </>
        ) : (
          <>
            <h2 className="sr-only">Search results</h2>
            <div className="results-bar">
              <div className="active-filters">
                {search.text && (
                  <button
                    type="button"
                    className="filter-chip"
                    aria-label={`Remove search words: ${search.text}`}
                    onClick={() => submitText("")}
                  >
                    &ldquo;{search.text}&rdquo; <span aria-hidden="true">×</span>
                  </button>
                )}
                {chips.map((chip) => (
                  <button
                    key={chip.key}
                    type="button"
                    className="filter-chip"
                    aria-label={`Remove filter: ${chip.label}`}
                    onClick={() => applyFilters(chip.remove(search.filters))}
                  >
                    {chip.label} <span aria-hidden="true">×</span>
                  </button>
                ))}
                {(chips.length > 0 || search.text) && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setInputText("");
                      setRecommendation(null);
                      runNewSearch({ text: "", filters: NO_FILTERS });
                    }}
                  >
                    Clear all
                  </button>
                )}
              </div>
              {results.status === "ready" && results.total > 0 && (
                <span className="result-count">
                  About {results.total.toLocaleString()} issues ·{" "}
                  {SORT_OPTIONS[search.filters.sort]}
                </span>
              )}
            </div>

            {recommendation && (
              <p className="view-note">
                {recommendation.error
                  ? "Couldn't read your repositories for recommendations. Try again in a moment."
                  : recommendation.languages.length === 0
                    ? "Your public repositories don't show a language yet, so there's nothing to recommend."
                    : (
                      <>
                        Recommended for you: beginner issues in{" "}
                        {search.filters.language || "any language"}.
                        {recommendation.languages.length > 1 && " Also try: "}
                        {recommendation.languages
                          .filter((language) => language !== search.filters.language)
                          .map((language, index) => (
                            <span key={language}>
                              {index > 0 && " · "}
                              <button
                                type="button"
                                className="text-button"
                                onClick={() =>
                                  runNewSearch({
                                    filters: { ...search.filters, language },
                                  })
                                }
                              >
                                {language}
                              </button>
                            </span>
                          ))}
                      </>
                    )}
              </p>
            )}
          </>
        )}

        {signInFailed && (
          <p className="notice" role="alert">
            Sign-in with GitHub didn&rsquo;t complete. Try again from the menu.
          </p>
        )}

        <div className="issues-list">
          {listMessage ? (
            <p className="empty-state">{listMessage}</p>
          ) : (
            shownIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                title={issue.title}
                description={issue.description}
                label={issue.label}
                language={issue.language}
                repo={issue.repo}
                url={issue.url}
                comments={issue.comments}
                updatedAt={issue.updatedAt}
                saved={savedIds.has(issue.id)}
                onToggleSave={signedIn ? () => toggleSaved(issue) : undefined}
              />
            ))
          )}
        </div>

        {!listMessage && totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              Previous
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>

      {projectsOpen && (
        <ProjectsDialog
          language={search.filters.language}
          signedIn={signedIn}
          onPickProject={(project) => pickFromSuggestions({ project })}
          onClose={() => setProjectsOpen(false)}
        />
      )}
    </main>
  );
}

export default App;
