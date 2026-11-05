import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  LANGUAGES,
  languagePageForSearch,
  stateFromLocation,
  stateToUrl,
} from "../src/search.js";
import {
  ABOUT,
  ALL_PAGES,
  GUIDE,
  HOME,
  LANGUAGE_PAGES,
  SITE_URL,
  languagePageForPath,
} from "../src/seoPages.js";
import { escapeHtml, pageBody, renderPage, sitemapXml } from "../scripts/prerender.js";

const template = fs.readFileSync("index.html", "utf8");
const python = LANGUAGE_PAGES.find((page) => page.language === "Python");
const search = (changes = {}, text = "", page = 1) => ({
  filters: { ...DEFAULT_FILTERS, ...changes },
  text,
  page,
});

describe("page list", () => {
  it("only offers languages the search filter knows", () => {
    for (const page of LANGUAGE_PAGES) expect(LANGUAGES).toContain(page.language);
  });

  it("gives every page its own address, title and description", () => {
    for (const key of ["path", "title", "description"]) {
      const values = ALL_PAGES.map((page) => page[key]);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it("uses addresses that need no encoding", () => {
    for (const page of LANGUAGE_PAGES) expect(page.slug).toMatch(/^[a-z]+$/);
  });

  it("keeps titles and descriptions short enough to show in results", () => {
    for (const page of ALL_PAGES) {
      expect(page.title.length).toBeLessThanOrEqual(70);
      expect(page.description.length).toBeLessThanOrEqual(190);
    }
  });

  it("matches index.html for the home page", () => {
    expect(template).toContain(`<title>${HOME.title}</title>`);
    expect(template.replace(/\s+/g, " ")).toContain(`content="${HOME.description}"`);
    expect(template).toContain(`rel="canonical" href="${SITE_URL}/"`);
  });
});

describe("languagePageForPath", () => {
  it("finds a page, with or without a trailing slash", () => {
    expect(languagePageForPath("/good-first-issues/python")).toBe(python);
    expect(languagePageForPath("/good-first-issues/python/")).toBe(python);
  });

  it("finds nothing for other addresses", () => {
    expect(languagePageForPath("/")).toBeNull();
    expect(languagePageForPath("/good-first-issues/cobol")).toBeNull();
  });
});

describe("stateFromLocation", () => {
  it("opens a language page on that language's search", () => {
    expect(stateFromLocation("/good-first-issues/cpp", "")).toEqual(search({ language: "C++" }));
  });

  it("lets a shared link's search win", () => {
    const state = stateFromLocation("/good-first-issues/python", "?lang=Go&labels=bug");
    expect(state.filters.language).toBe("Go");
  });

  it("leaves the home page on the default search", () => {
    expect(stateFromLocation("/", "")).toEqual(search());
  });
});

describe("languagePageForSearch", () => {
  it("matches a plain search for that language", () => {
    expect(languagePageForSearch(search({ language: "Python" }))).toBe(python);
  });

  it("is what opening the page gives back", () => {
    for (const page of LANGUAGE_PAGES) {
      expect(languagePageForSearch(stateFromLocation(page.path, ""))).toBe(page);
    }
  });

  it("doesn't match once the search is narrowed", () => {
    expect(languagePageForSearch(search())).toBeNull();
    expect(languagePageForSearch(search({ language: "Python" }, "docs"))).toBeNull();
    expect(languagePageForSearch(search({ language: "Python" }, "", 2))).toBeNull();
    expect(languagePageForSearch(search({ language: "Python", popular: true }))).toBeNull();
    expect(languagePageForSearch(search({ language: "Python", labels: [] }))).toBeNull();
  });

  it("doesn't match a language without its own page", () => {
    expect(languagePageForSearch(search({ language: "Zig" }))).toBeNull();
  });

  it("still gives a working address when there's no page", () => {
    const { filters, text, page } = search({ language: "Zig" });
    expect(stateToUrl(filters, text, page)).toContain("lang=Zig");
  });
});

describe("renderPage", () => {
  const titleOf = (html) => html.match(/<title>([^<]*)<\/title>/)[1];

  it("gives a language page its own details and text", () => {
    const html = renderPage(template, python);
    expect(titleOf(html)).toBe(python.title);
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}${python.path}" />`);
    expect(html).toContain(`<meta property="og:url" content="${SITE_URL}${python.path}" />`);
    expect(html).toContain(`<h1>${python.heading}</h1>`);
    expect(html).toContain("python -m venv .venv");
    expect(html).not.toContain("Find your first open-source issue.");
  });

  it("gives the About page its own title and canonical link", () => {
    const html = renderPage(template, ABOUT);
    expect(titleOf(html)).toBe(escapeHtml(ABOUT.title));
    expect(html).toContain(`<link rel="canonical" href="${SITE_URL}/about" />`);
    expect(html).toContain(ABOUT.heading);
  });

  it("includes every step of the guide", () => {
    const html = renderPage(template, GUIDE);
    for (const step of GUIDE.steps) expect(html).toContain(escapeHtml(step.name));
  });

  it("links the home page to every language page", () => {
    const html = pageBody(HOME);
    for (const page of LANGUAGE_PAGES) expect(html).toContain(`href="${page.path}"`);
  });

  it("escapes page text", () => {
    expect(escapeHtml(`<a href="x">&`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });

  it("stops the build if index.html changes shape", () => {
    expect(() => renderPage("<html></html>", python)).toThrow("prerender");
  });
});

describe("sitemapXml", () => {
  it("lists every page once", () => {
    const xml = sitemapXml();
    expect(xml.match(/<loc>/g)).toHaveLength(ALL_PAGES.length);
    for (const page of ALL_PAGES) expect(xml).toContain(`<loc>${SITE_URL}${page.path}</loc>`);
  });
});
