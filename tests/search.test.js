import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  activeFilterChips,
  buildQuery,
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
