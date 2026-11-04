import { describe, expect, it } from "vitest";
import {
  MAX_RECENT,
  addRecent,
  cleanRecent,
  recentLabel,
  removeRecent,
  visibleRecent,
} from "../src/recent.js";

const text = (value) => ({ type: "text", value });
const language = (value) => ({ type: "language", value });
const project = (value) => ({ type: "project", value });

describe("addRecent", () => {
  it("puts the newest search first", () => {
    expect(addRecent([text("old")], text("new"))).toEqual([text("new"), text("old")]);
  });

  it("moves a repeated search back to the top, ignoring case", () => {
    const list = [text("a"), text("React"), text("b")];
    expect(addRecent(list, text("react"))).toEqual([text("react"), text("a"), text("b")]);
  });

  it("keeps a language and the same words as separate searches", () => {
    const list = addRecent([text("Python")], language("Python"));
    expect(list).toEqual([language("Python"), text("Python")]);
  });

  it(`remembers at most ${MAX_RECENT}`, () => {
    let list = [];
    for (let i = 0; i < MAX_RECENT + 3; i++) list = addRecent(list, text(`search ${i}`));
    expect(list).toHaveLength(MAX_RECENT);
    expect(list[0]).toEqual(text(`search ${MAX_RECENT + 2}`));
  });

  it("ignores empty searches and trims the rest", () => {
    expect(addRecent([], text("   "))).toEqual([]);
    expect(addRecent([], text("  rust  "))).toEqual([text("rust")]);
  });
});

describe("removeRecent", () => {
  it("removes only that search", () => {
    const list = [text("a"), language("Go"), text("b")];
    expect(removeRecent(list, language("Go"))).toEqual([text("a"), text("b")]);
  });
});

describe("cleanRecent", () => {
  it("returns nothing for data that isn't a list", () => {
    expect(cleanRecent(null)).toEqual([]);
    expect(cleanRecent("python")).toEqual([]);
    expect(cleanRecent({ type: "text" })).toEqual([]);
  });

  it("drops entries we wouldn't have stored", () => {
    const list = [
      text("rust"),
      { type: "evil", value: "x" },
      { type: "text", value: 5 },
      language("Not a language"),
      project("not a valid//name"),
      null,
      language("Python"),
      project("vercel/next.js"),
    ];
    expect(cleanRecent(list)).toEqual([
      text("rust"),
      language("Python"),
      project("vercel/next.js"),
    ]);
  });

  it("removes repeats and keeps the limit", () => {
    const many = Array.from({ length: 9 }, (_, i) => text(`s${i}`));
    expect(cleanRecent([text("A"), text("a")])).toEqual([text("A")]);
    expect(cleanRecent(many)).toHaveLength(MAX_RECENT);
  });
});

describe("recentLabel", () => {
  it("reads like the suggestion it came from", () => {
    expect(recentLabel(text("machine learning"))).toBe("machine learning");
    expect(recentLabel(language("Python"))).toBe("Python issues");
    expect(recentLabel(project("vercel/next.js"))).toBe("vercel/next.js");
    expect(recentLabel(project("vercel"))).toBe("Projects by vercel");
  });
});

describe("visibleRecent", () => {
  const list = [text("python web"), language("Python"), project("vercel"), text("docs")];

  it("shows everything while the box is empty", () => {
    expect(visibleRecent(list, "  ")).toEqual(list);
  });

  it("shows only matches while typing, ignoring case", () => {
    expect(visibleRecent(list, "PY")).toEqual([text("python web"), language("Python")]);
    expect(visibleRecent(list, "projects by")).toEqual([project("vercel")]);
  });

  it("hides words identical to what's typed, already offered as a search", () => {
    expect(visibleRecent(list, "docs")).toEqual([]);
  });
});
