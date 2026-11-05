import { languagePageFor, languagePageForPath } from "./seoPages";
import { SPOKEN_LANGUAGES } from "./spokenLanguages";

// Turns the site's filters into a GitHub issue search, and back and forth
// between the filters and the page address (so a search can be shared).

export const PER_PAGE = 10;
// GitHub's search API returns at most 1,000 results for any query.
export const MAX_RESULTS = 1000;
const MAX_TEXT_LENGTH = 200;
// GitHub rejects search queries longer than this.
const MAX_QUERY_LENGTH = 256;
// "Popular, active projects": well-known and recently worked on.
const POPULAR_MIN_STARS = 1000;
const POPULAR_ACTIVE_DAYS = 30;
const POPULAR_MIN_BEGINNER_ISSUES = 3;
const POPULAR_CANDIDATES = 30;

export const LABELS = {
  "good-first-issue": { name: "Good first issue", labels: ["good first issue"] },
  "help-wanted": { name: "Help wanted", labels: ["help wanted"] },
  documentation: { name: "Documentation", labels: ["documentation"] },
  bug: { name: "Bug", labels: ["bug"] },
  feature: { name: "Feature", labels: ["enhancement", "feature"] },
};

export const COMMENT_OPTIONS = {
  any: "Any",
  none: "None yet",
  few: "Fewer than 5",
};

export const UPDATED_OPTIONS = {
  any: "Any time",
  today: "Today",
  week: "This week",
  month: "This month",
};

export const SORT_OPTIONS = {
  updated: "Recently updated",
  newest: "Newest",
  comments: "Most commented",
  best: "Best match",
};

export const LANGUAGES = [
  "JavaScript", "TypeScript", "Python", "Java", "Go", "Rust", "C++", "C#",
  "C", "Ruby", "PHP", "Swift", "Kotlin", "Dart", "Scala", "Elixir",
  "Haskell", "Lua", "R", "Shell", "HTML", "CSS", "Vue", "Svelte", "Julia",
  "Perl", "Zig", "Clojure", "Elm", "OCaml", "Objective-C", "PowerShell",
  "Jupyter Notebook",
];

export const DEFAULT_FILTERS = {
  labels: ["good-first-issue"],
  notTaken: true,
  noPullRequest: false,
  comments: "any",
  updated: "any",
  language: "",
  regional: "",
  project: "",
  popular: false,
  sort: "updated",
};

// One-click starting points shown under "Beginner friendly". Each keeps the
// chosen language and project, and resets the rest.
export const BEGINNER_PRESETS = [
  {
    id: "first-issues",
    name: "Good first issues nobody has taken",
    icon: "sparkleFill",
    filters: { labels: ["good-first-issue"], notTaken: true, noPullRequest: true },
  },
  {
    id: "today",
    name: "Updated today",
    icon: "clock",
    filters: {
      labels: ["good-first-issue", "help-wanted"],
      notTaken: true,
      updated: "today",
    },
  },
  {
    id: "docs",
    name: "Docs and small fixes",
    icon: "book",
    filters: { labels: ["documentation"], notTaken: true },
  },
];

const PROJECT_PATTERN = /^[\w.-]+(\/[\w.-]+)?$/;

export const isValidProject = (value) => PROJECT_PATTERN.test(value);

function isoDaysAgo(days) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

const UPDATED_DAYS = { today: 0, week: 7, month: 30 };

const spokenLanguage = (code) =>
  SPOKEN_LANGUAGES.find((language) => language.code === code);

// The everyday English name: "Hindi", or "Greek" for "Greek, Modern".
export function regionalName(code) {
  return spokenLanguage(code)?.name.split(",")[0].trim() ?? "";
}

// GitHub can't filter by the language an issue is written in, so this finds
// issues that mention the language, in English or in its own script.
function regionalTerms(code) {
  const language = spokenLanguage(code);
  if (!language) return "";
  const terms = [regionalName(code), language.native].filter(Boolean).map(quote);
  return terms.length > 1 ? `(${terms.join(" OR ")})` : terms[0];
}

// Quotes values with spaces or symbols, e.g. "good first issue" or "C++".
const quote = (value) => (/^[\w-]+$/.test(value) ? value : `"${value}"`);

// `repos` (from "Popular, active projects only") limits the search to those
// projects; as many are added as fit in GitHub's query length limit.
export function buildQuery(filters, text, repos = []) {
  const parts = ["is:issue", "is:open", "archived:false"];

  // Several labels in one "label:" means "any of these".
  const labels = filters.labels.flatMap((key) => LABELS[key]?.labels ?? []);
  if (labels.length > 0) {
    parts.push(`label:${labels.map((label) => `"${label}"`).join(",")}`);
  }
  if (filters.notTaken) parts.push("no:assignee");
  if (filters.noPullRequest) parts.push("-linked:pr");
  if (filters.comments === "none") parts.push("comments:0");
  if (filters.comments === "few") parts.push("comments:<5");
  if (filters.updated in UPDATED_DAYS) {
    parts.push(`updated:>=${isoDaysAgo(UPDATED_DAYS[filters.updated])}`);
  }
  if (filters.language) parts.push(`language:${quote(filters.language)}`);
  if (filters.regional) parts.push(regionalTerms(filters.regional));
  if (filters.project) {
    parts.push(
      `${filters.project.includes("/") ? "repo" : "org"}:${filters.project}`,
    );
  }

  const words = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (words) parts.push(words);

  // Several "repo:" in one query means "any of these projects".
  let query = parts.join(" ");
  for (const repo of filters.project ? [] : repos) {
    const next = `${query} repo:${repo}`;
    if (next.length > MAX_QUERY_LENGTH) break;
    query = next;
  }
  return query;
}

// Which of `repos` actually fit into the query (shown under the results).
export function reposInQuery(query, repos) {
  return repos.filter((repo) => query.includes(`repo:${repo}`));
}

export function searchPath(filters, text, page, repos = []) {
  const params = new URLSearchParams({
    q: buildQuery(filters, text, repos),
    per_page: String(PER_PAGE),
    page: String(page),
  });
  const sort = { updated: "updated", newest: "created", comments: "comments" }[
    filters.sort
  ];
  if (sort) {
    params.set("sort", sort);
    params.set("order", "desc");
  }
  return `/search/issues?${params}`;
}

// GitHub's issue search can't filter by stars, so "Popular, active projects
// only" first finds such projects (a repository search), then searches
// issues inside them.
export function popularReposPath(filters) {
  const parts = [
    `stars:>=${POPULAR_MIN_STARS}`,
    "archived:false",
    `pushed:>=${isoDaysAgo(POPULAR_ACTIVE_DAYS)}`,
  ];
  if (filters.labels.includes("good-first-issue")) {
    parts.push(`good-first-issues:>=${POPULAR_MIN_BEGINNER_ISSUES}`);
  } else if (filters.labels.includes("help-wanted")) {
    parts.push(`help-wanted-issues:>=${POPULAR_MIN_BEGINNER_ISSUES}`);
  }
  if (filters.language) parts.push(`language:${quote(filters.language)}`);

  const params = new URLSearchParams({
    q: parts.join(" "),
    sort: "stars",
    order: "desc",
    per_page: String(POPULAR_CANDIDATES),
  });
  return `/search/repositories?${params}`;
}

// Address-bar format, e.g. ?labels=good-first-issue&available=1&lang=Python
export function stateFromUrl(search) {
  const params = new URLSearchParams(search);
  const known = ["q", "labels", "available", "nopr", "comments", "updated",
    "lang", "region", "project", "popular", "sort", "page"];
  if (!known.some((key) => params.has(key))) {
    return { filters: DEFAULT_FILTERS, text: "", page: 1 };
  }

  const pick = (key, options, fallback) =>
    params.get(key) in options ? params.get(key) : fallback;
  const language = params.get("lang") || "";
  const regional = params.get("region") || "";
  const project = params.get("project") || "";

  return {
    filters: {
      labels: (params.get("labels") || "")
        .split(",")
        .filter((key) => key in LABELS),
      notTaken: params.get("available") === "1",
      noPullRequest: params.get("nopr") === "1",
      comments: pick("comments", COMMENT_OPTIONS, "any"),
      updated: pick("updated", UPDATED_OPTIONS, "any"),
      language: LANGUAGES.includes(language) ? language : "",
      regional: spokenLanguage(regional) ? regional : "",
      project: isValidProject(project) ? project : "",
      popular: params.get("popular") === "1",
      sort: pick("sort", SORT_OPTIONS, "updated"),
    },
    text: (params.get("q") || "").slice(0, MAX_TEXT_LENGTH),
    page: Math.min(
      Math.max(1, Number.parseInt(params.get("page"), 10) || 1),
      MAX_RESULTS / PER_PAGE,
    ),
  };
}

// A language's own page (/good-first-issues/python) opens that language's search.
export function stateFromLocation(pathname, search) {
  const page = languagePageForPath(pathname);
  if (page && !search) {
    return { filters: { ...DEFAULT_FILTERS, language: page.language }, text: "", page: 1 };
  }
  return stateFromUrl(search);
}

// The language page that shows exactly this search, if there is one: only the
// language differs from the default search, with no words and on the first page.
export function languagePageForSearch({ filters, text, page }) {
  if (text || page !== 1 || !filters.language) return null;
  const same = Object.keys(DEFAULT_FILTERS).every(
    (key) =>
      key === "language" ||
      JSON.stringify(filters[key]) === JSON.stringify(DEFAULT_FILTERS[key]),
  );
  return same ? languagePageFor(filters.language) : null;
}

export function stateToUrl(filters, text, page) {
  const params = new URLSearchParams();
  if (text) params.set("q", text);
  params.set("labels", filters.labels.join(","));
  if (filters.notTaken) params.set("available", "1");
  if (filters.noPullRequest) params.set("nopr", "1");
  if (filters.comments !== "any") params.set("comments", filters.comments);
  if (filters.updated !== "any") params.set("updated", filters.updated);
  if (filters.language) params.set("lang", filters.language);
  if (filters.regional) params.set("region", filters.regional);
  if (filters.project) params.set("project", filters.project);
  if (filters.popular) params.set("popular", "1");
  if (filters.sort !== "updated") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  return `?${params}`;
}

// The chips shown above the results; each knows how to remove itself.
export function activeFilterChips(filters) {
  const chips = filters.labels.map((key) => ({
    key: `label-${key}`,
    label: LABELS[key].name,
    remove: (current) => ({
      ...current,
      labels: current.labels.filter((label) => label !== key),
    }),
  }));

  const add = (when, key, label, reset) => {
    if (when) chips.push({ key, label, remove: (current) => ({ ...current, ...reset }) });
  };
  add(filters.notTaken, "not-taken", "Not taken yet", { notTaken: false });
  add(filters.noPullRequest, "no-pr", "No pull request yet", { noPullRequest: false });
  add(filters.comments !== "any", "comments", `Comments: ${COMMENT_OPTIONS[filters.comments]}`, { comments: "any" });
  add(filters.updated !== "any", "updated", `Updated: ${UPDATED_OPTIONS[filters.updated]}`, { updated: "any" });
  add(Boolean(filters.language), "language", filters.language, { language: "" });
  add(Boolean(filters.regional), "regional", `Mentions ${regionalName(filters.regional)}`, { regional: "" });
  add(Boolean(filters.project), "project", filters.project, { project: "" });
  add(filters.popular && !filters.project, "popular", "Popular projects only", { popular: false });

  return chips;
}

export function countActiveFilters(filters) {
  return activeFilterChips(filters).length;
}

// Turns a search result into the shape the issue cards and Saved use.
export function toIssue(item, language) {
  const labels = (item.labels || []).map((label) =>
    typeof label === "string" ? label : label.name || "",
  );
  const repo = item.repository_url?.split("/repos/")[1] || "";

  return {
    id: item.id,
    updatedAt: item.updated_at,
    title: item.title || "Untitled issue",
    description: item.body || "No description provided.",
    labels,
    label: labels.filter(Boolean).join(", ") || "Unlabeled",
    language: language || "",
    repo: repo.replace("/", " / "),
    url: item.html_url,
    comments: item.comments ?? 0,
  };
}
