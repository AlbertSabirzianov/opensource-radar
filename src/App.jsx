import { useEffect, useRef, useState } from "react";
import Icon from "./components/Icon";
import IssueCard from "./components/IssueCard";
import NavMenu from "./components/NavMenu";
import { githubUrl } from "./github";
import "./App.css";

const CACHE_KEY = "opensource-radar-issues-v11";
const THEME_KEY = "opensource-radar-theme";
const CACHE_DURATION = 10 * 60 * 1000;
const ISSUES_PER_PAGE = 10;
const BEGINNER_LABELS = ["good first issue", "help wanted"];
const REPOSITORIES = {
  "facebook/react": "JavaScript",
  "vuejs/core": "TypeScript",
  "pallets/flask": "Python",
  "spring-projects/spring-boot": "Java",
};

const normalizeLabel = (label) =>
  String(label || "")
    .trim()
    .toLowerCase();

const isBeginnerFriendly = (issue) =>
  (issue.labels || []).some((label) =>
    BEGINNER_LABELS.includes(normalizeLabel(label)),
  );

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)";
const SAVED_KEY_PREFIX = "opensource-radar-saved-";
const SAVED_DESCRIPTION_LENGTH = 1000;
const RECOMMENDED_LANGUAGE_COUNT = 5;
const EMPTY_RECOMMENDATION = { status: "idle", languages: [] };

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

const SYNCED_KEY_PREFIX = "opensource-radar-saved-synced-";

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

async function fetchGitHubIssues(path, repo, signedIn) {
  const response = await fetch(githubUrl(path, signedIn));

  if (!response.ok) {
    if (signedIn && response.status === 401) {
      const error = new Error("Your GitHub sign-in has expired.");
      error.isSignedOut = true;
      throw error;
    }

    if (response.status === 403 || response.status === 429) {
      const reset = Number(response.headers.get("x-ratelimit-reset"));
      const retryAt = reset
        ? ` Try again after ${new Date(reset * 1000).toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}.`
        : " Please wait before refreshing.";
      const error = new Error(`GitHub API rate limit reached.${retryAt}`);
      error.isRateLimit = true;
      throw error;
    }

    throw new Error(`GitHub request failed for ${repo} (${response.status}).`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected GitHub response for ${repo}.`);
  }

  return data;
}

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [languageFilter, setLanguageFilter] = useState("All");
  const [sortBy, setSortBy] = useState("updated");
  const [beginnerOnly, setBeginnerOnly] = useState(false);
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastUpdated, setLastUpdated] = useState(null);
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

  const refreshIssues = () => setRefreshKey((key) => key + 1);

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
  // "all", "saved" or "recommended": which issues the list shows.
  const [view, setView] = useState("all");
  const [savedIssues, setSavedIssues] = useState([]);
  const [recommendation, setRecommendation] = useState(EMPTY_RECOMMENDATION);

  useEffect(() => {
    let cancelled = false;

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

  const showIssues = (nextView) => {
    setView(nextView);
    document
      .querySelector(".issues-section")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  const showRecommended = async () => {
    showIssues("recommended");
    if (recommendation.status === "ready" || recommendation.status === "loading") {
      return;
    }

    setRecommendation({ ...EMPTY_RECOMMENDATION, status: "loading" });
    try {
      const response = await fetch(
        githubUrl("/user/repos?per_page=100&sort=pushed&affiliation=owner", true),
      );
      if (!response.ok) throw new Error("Couldn't read your repositories.");

      setRecommendation({
        status: "ready",
        languages: topLanguages(await response.json()),
      });
    } catch {
      setRecommendation({ ...EMPTY_RECOMMENDATION, status: "error" });
    }
  };

  useEffect(() => {
    if (!signInFailed) return;

    const url = new URL(window.location.href);
    url.searchParams.delete("signin");
    window.history.replaceState(null, "", url);
  }, [signInFailed]);

  const signOut = async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch {
      // The local sign-out below still applies.
    }
    setAccount((current) => ({ ...current, user: null }));
    setSavedIssues([]);
    setRecommendation(EMPTY_RECOMMENDATION);
    setView("all");
  };

  const signedIn = Boolean(account.user);

  useEffect(() => {
    // Wait until we know whether the visitor is signed in, so issues load
    // once, through the right route.
    if (!account.checked) return undefined;

    let cancelled = false;

    async function loadIssues() {
      setLoading(true);
      let cachedData = null;
      let cachedTimestamp = null;
      setError("");
      setNotice("");

      try {
        // Always read the cache so it can serve as a fallback if GitHub
        // fails; only use it directly on a normal load (not a refresh).
        try {
          const cached = localStorage.getItem(CACHE_KEY);

          if (cached) {
            const parsedCache = JSON.parse(cached);
            const { timestamp, data } = parsedCache;
            if (Array.isArray(data)) {
              cachedData = data;
              cachedTimestamp = timestamp;
            }

            if (
              refreshKey === 0 &&
              Date.now() - timestamp < CACHE_DURATION &&
              Array.isArray(data)
            ) {
              if (!cancelled) {
                setIssues(data);
                setLastUpdated(timestamp);
                setLoading(false);
              }
              return;
            }
          }
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }

        const repoResults = await Promise.allSettled(
          Object.entries(REPOSITORIES).map(async ([repo, language]) => {
            const basePath = `/repos/${repo}/issues`;
            const commonParams =
              "state=open&sort=updated&direction=desc&per_page=100";

            const paths = [
              `${basePath}?${commonParams}`,
              ...BEGINNER_LABELS.map(
                (label) =>
                  `${basePath}?${commonParams}&labels=${encodeURIComponent(label)}`,
              ),
            ];

            const responses = await Promise.all(
              paths.map((path) => fetchGitHubIssues(path, repo, signedIn)),
            );

            const uniqueIssues = new Map();

            responses.flat().forEach((issue) => {
              if (!issue.pull_request) {
                uniqueIssues.set(issue.id, issue);
              }
            });

            return [...uniqueIssues.values()].map((issue) => {
              const labels = (issue.labels || []).map((label) =>
                typeof label === "string" ? label : label.name || "",
              );

              return {
                id: issue.id,
                updatedAt: issue.updated_at,
                title: issue.title || "Untitled issue",
                description: issue.body || "No description provided.",
                labels,
                label: labels.filter(Boolean).join(", ") || "Unlabeled",
                language,
                repo: repo.replace("/", " / "),
                url: issue.html_url,
              };
            });
          }),
        );

        const data = repoResults.flatMap((result) =>
          result.status === "fulfilled" ? result.value : [],
        );

        if (
          data.length === 0 &&
          repoResults.some((result) => result.status === "rejected")
        ) {
          const rejectedWith = (flag) =>
            repoResults.find(
              (result) => result.status === "rejected" && result.reason?.[flag],
            )?.reason;

          throw (
            rejectedWith("isSignedOut") ||
            rejectedWith("isRateLimit") ||
            new Error(
              "Unable to load issues from GitHub. Please wait and try again.",
            )
          );
        }

        if (cancelled) return;

        const fetchedAt = Date.now();
        setIssues(data);
        setLastUpdated(fetchedAt);

        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: fetchedAt, data }),
          );
        } catch {
          localStorage.removeItem(CACHE_KEY);
        }
      } catch (err) {
        if (cancelled) return;

        if (err.isSignedOut) {
          // Session expired: show the signed-out menu; this effect then
          // reloads the issues the anonymous way.
          setAccount((current) => ({ ...current, user: null }));
          return;
        }

        if (cachedData && cachedData.length > 0) {
          setIssues(cachedData);
          setLastUpdated(cachedTimestamp);
          setError("");
          setNotice(
            `${err.message || "Unable to load issues from GitHub."} Showing saved issues for now.`,
          );
        } else {
          setError(err.message || "Unable to load issues from GitHub.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadIssues();

    return () => {
      cancelled = true;
    };
  }, [refreshKey, account.checked, signedIn]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, languageFilter, sortBy, beginnerOnly, refreshKey, view]);

  const languages = [
    "All",
    ...new Set(issues.map((issue) => issue.language).filter(Boolean)),
  ];

  const query = searchQuery.trim().toLowerCase();
  console.log("Search:", searchQuery);
  console.log("Language:", languageFilter);
  console.log("Beginner only:", beginnerOnly);
  const savedIds = new Set(savedIssues.map((issue) => issue.id));
  const viewIssues =
    view === "saved"
      ? savedIssues
      : view === "recommended"
        ? issues.filter((issue) =>
            recommendation.languages.includes(issue.language),
          )
        : issues;

  const filteredIssues = viewIssues.filter((issue) => {
    const labels = (issue.labels || []).join(" ").toLowerCase();
    const matchesSearch =
      issue.title.toLowerCase().includes(query) ||
      issue.description.toLowerCase().includes(query) ||
      issue.repo.toLowerCase().includes(query) ||
      issue.language.toLowerCase().includes(query) ||
      labels.includes(query);

    const matchesLanguage =
      languageFilter === "All" || issue.language === languageFilter;

    const matchesBeginner = !beginnerOnly || isBeginnerFriendly(issue);

    return matchesSearch && matchesLanguage && matchesBeginner;
  });

  const sortedIssues = [...filteredIssues].sort((a, b) => {
    // Recommendations put beginner-friendly issues first.
    if (view === "recommended") {
      const beginnerFirst = isBeginnerFriendly(b) - isBeginnerFriendly(a);
      if (beginnerFirst !== 0) return beginnerFirst;
    }

    if (sortBy === "title") {
      return a.title.localeCompare(b.title);
    }

    if (sortBy === "repo") {
      return a.repo.localeCompare(b.repo);
    }

    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const totalPages = Math.ceil(sortedIssues.length / ISSUES_PER_PAGE);
  const startIndex = (currentPage - 1) * ISSUES_PER_PAGE;
  const currentIssues = sortedIssues.slice(
    startIndex,
    startIndex + ISSUES_PER_PAGE,
  );
  console.log("Total issues:", issues.length);
  console.log("Filtered issues:", filteredIssues.length);
  console.log("Sorted issues:", sortedIssues.length);
  console.log("Current page issues:", currentIssues.length);

  const heading =
    view === "saved"
      ? "Saved issues"
      : view === "recommended"
        ? "Recommended for you"
        : beginnerOnly
          ? "Explore beginner-friendly issues"
          : "Explore open-source issues";

  let emptyMessage = error || "No issues found. Try changing your filters.";
  if (view === "saved" && savedIssues.length === 0) {
    emptyMessage =
      "You haven't saved any issues yet. Use the bookmark on an issue to save it here.";
  } else if (view === "recommended") {
    if (recommendation.status === "loading") {
      emptyMessage = "Looking at the languages in your repositories...";
    } else if (recommendation.status === "error") {
      emptyMessage = "Couldn't read your repositories. Try again in a moment.";
    } else if (recommendation.languages.length === 0) {
      emptyMessage =
        "Your public repositories don't show a language yet, so there's nothing to match.";
    } else if (viewIssues.length === 0) {
      emptyMessage = `None of the tracked repositories use ${recommendation.languages.join(", ")} yet.`;
    }
  }

  return (
    <main className="app">
      <nav className="navbar">
        <h2>OpenSource Radar</h2>
        <div className="nav-actions">
          <NavMenu
            themePreference={themePreference}
            onThemeChange={changeThemePreference}
            onRefresh={refreshIssues}
            loading={loading}
            lastUpdated={lastUpdated}
            repositories={Object.keys(REPOSITORIES)}
            user={account.user}
            signInAvailable={account.signInAvailable}
            onSignOut={signOut}
            savedCount={savedIssues.length}
            onShowSaved={() => showIssues("saved")}
            onShowRecommended={showRecommended}
            reportsAvailable={account.reportsAvailable}
            theme={theme}
          />
        </div>
      </nav>

      <section className="hero">
        <p className="eyebrow">YOUR OPEN-SOURCE JOURNEY STARTS HERE</p>
        <h1>Find your first open-source issue.</h1>
        <p className="description">
          Discover beginner-friendly GitHub issues and take your first step
          toward contributing to open source.
        </p>

        <div className="search">
          <form
            className="search-field"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setSearchQuery(searchQuery.trim());
            }}
          >
            <svg
              className="search-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              id="issue-search"
              name="issue-search"
              type="text"
              placeholder="Search issues, repositories, or technologies..."
              aria-label="Search issues"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </form>

          <div className="search-filters">
            <div
              className="filter-chips"
              role="group"
              aria-label="Filter by programming language"
            >
              {languages.map((language) => (
                <button
                  key={language}
                  type="button"
                  className={`chip${languageFilter === language ? " chip-active" : ""}`}
                  aria-pressed={languageFilter === language}
                  onClick={() => setLanguageFilter(language)}
                >
                  {language === "All" ? "All" : language}
                </button>
              ))}

              <label
                className={`chip beginner-filter${beginnerOnly ? " chip-active" : ""}`}
              >
                <input
                  id="beginner-only"
                  name="beginner-only"
                  type="checkbox"
                  checked={beginnerOnly}
                  onChange={(event) => setBeginnerOnly(event.target.checked)}
                />
                Beginner-friendly
              </label>
            </div>

            <div className="search-actions">
              <select
                id="sort-by"
                name="sort-by"
                aria-label="Sort issues"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="updated">Recently updated</option>
                <option value="title">Title (A–Z)</option>
                <option value="repo">Repository (A–Z)</option>
              </select>

              <button
                type="button"
                className="refresh-button"
                onClick={refreshIssues}
                disabled={loading}
              >
                {loading ? "Loading..." : "↻ Refresh"}
              </button>
            </div>
          </div>
        </div>

        <p className="note">
          Built for curious developers and first-time contributors.
        </p>
      </section>

      <section className="issues-section">
        <div className="issues-header">
          <h2>{heading}</h2>
          {view !== "all" && (
            <button
              type="button"
              className="back-button"
              onClick={() => setView("all")}
            >
              <Icon name="arrowLeft" />
              All issues
            </button>
          )}
        </div>

        {view === "recommended" && recommendation.languages.length > 0 && (
          <p className="view-note">
            Matching the languages you use most:{" "}
            {recommendation.languages.join(", ")}. Beginner-friendly issues
            come first.
          </p>
        )}
        {view === "saved" && savedIssues.length > 0 && (
          <p className="view-note">
            {account.savedSync
              ? `Synced to @${account.user?.login} on every device you sign in on.`
              : `Saved in this browser for @${account.user?.login}.`}
          </p>
        )}

        {signInFailed && (
          <p className="notice" role="alert">
            Sign-in with GitHub didn&rsquo;t complete. Try again from the
            menu.
          </p>
        )}

        {notice && !loading && (
          <p className="notice" role="status">
            {notice}
          </p>
        )}

        <div className="issues-list">
          {loading && view !== "saved" ? (
            <p>Loading issues from GitHub...</p>
          ) : error && issues.length === 0 && view !== "saved" ? (
            <p className="empty-state">{error}</p>
          ) : sortedIssues.length > 0 ? (
            currentIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                title={issue.title}
                description={issue.description}
                label={issue.label}
                language={issue.language}
                repo={issue.repo}
                url={issue.url}
                saved={savedIds.has(issue.id)}
                onToggleSave={signedIn ? () => toggleSaved(issue) : undefined}
              />
            ))
          ) : (
            <p className="empty-state">{emptyMessage}</p>
          )}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>

            <span>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(totalPages, page + 1))
              }
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;
