import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterChips,
  buildQuery,
  popularReposPath,
  reposInQuery,
  searchPath,
  stateFromUrl,
  stateToUrl,
  toIssue,
} from "../src/search.js";

const allFilters = {
  ...DEFAULT_FILTERS,
  labels: ["good-first-issue", "feature"],
  noPullRequest: true,
  comments: "few",
  updated: "week",
  language: "C++",
  project: "vercel/next.js",
  sort: "comments",
};

describe("buildQuery", () => {
  it("starts with beginner issues nobody has taken", () => {
    expect(buildQuery(DEFAULT_FILTERS, "")).toBe(
      'is:issue is:open archived:false label:"good first issue" no:assignee',
    );
  });

  it("turns every filter into GitHub search syntax", () => {
    const query = buildQuery(allFilters, "  crash  ");
    expect(query).toContain('label:"good first issue","enhancement","feature"');
    expect(query).toContain("-linked:pr");
    expect(query).toContain("comments:<5");
    expect(query).toMatch(/updated:>=\d{4}-\d\d-\d\d/);
    expect(query).toContain('language:"C++"');
    expect(query).toContain("repo:vercel/next.js");
    expect(query.endsWith(" crash")).toBe(true);
  });

  it("uses org: for a name without a slash", () => {
    expect(buildQuery({ ...DEFAULT_FILTERS, project: "vercel" }, "")).toContain(
      "org:vercel",
    );
  });
});

describe("searchPath", () => {
  it("includes sorting and the page", () => {
    const path = searchPath(allFilters, "", 3);
    expect(path).toContain("sort=comments");
    expect(path).toContain("page=3");
    expect(path).toContain("per_page=10");
  });

  it("sends no sort for best match", () => {
    expect(searchPath({ ...allFilters, sort: "best" }, "", 1)).not.toContain(
      "sort=",
    );
  });
});

describe("address bar", () => {
  it("round-trips every filter, the words and the page", () => {
    const back = stateFromUrl(stateToUrl(allFilters, "crash", 4));
    expect(back).toEqual({ filters: allFilters, text: "crash", page: 4 });
  });

  it("uses the defaults for an empty address", () => {
    expect(stateFromUrl("").filters).toEqual(DEFAULT_FILTERS);
  });

  it("ignores unknown or unsafe values", () => {
    const state = stateFromUrl(
      "?labels=evil,bug&lang=Klingon&project=a%20b&comments=lots&sort=x&page=9999",
    );
    expect(state.filters.labels).toEqual(["bug"]);
    expect(state.filters.language).toBe("");
    expect(state.filters.project).toBe("");
    expect(state.filters.comments).toBe("any");
    expect(state.filters.sort).toBe("updated");
    expect(state.page).toBe(100);
  });
});

describe("activeFilterChips", () => {
  it("lists each active filter and can remove it", () => {
    const chips = activeFilterChips(allFilters);
    expect(chips.map((chip) => chip.label)).toEqual([
      "Good first issue",
      "Feature",
      "Not taken yet",
      "No pull request yet",
      "Comments: Fewer than 5",
      "Updated: This week",
      "C++",
      "vercel/next.js",
    ]);
    expect(chips.find((chip) => chip.key === "language").remove(allFilters).language).toBe("");
    expect(chips[1].remove(allFilters).labels).toEqual(["good-first-issue"]);
  });
});

describe("toIssue", () => {
  it("turns a search result into a card", () => {
    const issue = toIssue(
      {
        id: 1,
        title: "",
        body: null,
        labels: [{ name: "bug" }],
        repository_url: "https://api.github.com/repos/a/b",
        html_url: "https://github.com/a/b/issues/1",
        updated_at: "2026-11-02",
        comments: 3,
      },
      "Go",
    );
    expect(issue).toMatchObject({
      repo: "a / b",
      title: "Untitled issue",
      description: "No description provided.",
      label: "bug",
      comments: 3,
      language: "Go",
    });
  });
});

describe("popular, active projects", () => {
  const repos = Array.from({ length: 30 }, (_, i) => `some-organisation/project-number-${i}`);

  it("limits the search to as many projects as fit in GitHub's 256 characters", () => {
    const filters = { ...DEFAULT_FILTERS, popular: true, language: "Python" };
    const query = buildQuery(filters, "", repos);
    expect(query.length).toBeLessThanOrEqual(256);
    const included = reposInQuery(query, repos);
    expect(included.length).toBeGreaterThan(0);
    expect(included.length).toBeLessThan(repos.length);
    expect(included).toEqual(repos.slice(0, included.length));
  });

  it("ignores the popular list when a project is chosen", () => {
    const filters = { ...DEFAULT_FILTERS, popular: true, project: "vercel/next.js" };
    expect(buildQuery(filters, "", repos)).not.toContain("some-organisation");
    expect(activeFilterChips(filters).map((chip) => chip.label)).not.toContain(
      "Popular projects only",
    );
  });

  it("asks GitHub for well-known, recently active projects", () => {
    const path = popularReposPath({ ...DEFAULT_FILTERS, language: "C++" });
    const params = new URLSearchParams(path.split("?")[1]);
    const query = params.get("q");
    expect(query).toContain("stars:>=1000");
    expect(query).toContain("good-first-issues:>=3");
    expect(query).toMatch(/pushed:>=\d{4}-\d\d-\d\d/);
    expect(query).toContain('language:"C++"');
    expect(params.get("sort")).toBe("stars");
  });

  it("is kept in the address bar and shown as a chip", () => {
    const filters = { ...DEFAULT_FILTERS, popular: true };
    expect(stateFromUrl(stateToUrl(filters, "", 1)).filters.popular).toBe(true);
    expect(activeFilterChips(filters).map((chip) => chip.label)).toContain(
      "Popular projects only",
    );
  });
});
