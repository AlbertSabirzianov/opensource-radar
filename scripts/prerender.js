// Runs after `vite build`. Gives each page its own HTML file with its own title,
// description, canonical link and text, so search engines can read it without
// running the app, and writes the sitemap from the same list of pages.
import fs from "node:fs";
import path from "node:path";
import {
  ABOUT,
  ALL_PAGES,
  CONTENT_UPDATED,
  FAQ,
  GUIDE,
  GUIDE_PATH,
  HOME,
  LANGUAGE_PAGES,
  SITE_URL,
} from "../src/seoPages.js";

export const escapeHtml = (text) =>
  String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const pageUrl = (page) => `${SITE_URL}${page.path}`;

const NO_SCRIPT = `<noscript><p>OpenSource Radar helps beginners find good first issues on GitHub. It needs JavaScript to search. <a href="/about">Read about OpenSource Radar</a> or see the <a href="https://github.com/opensource-radar/opensource-radar">project on GitHub</a>.</p></noscript>`;

const faqHtml = (items) =>
  items
    .map(
      ({ question, answer }) =>
        `<div class="search-help-item"><h3>${escapeHtml(question)}</h3><p>${escapeHtml(answer)}</p></div>`,
    )
    .join("");

const browseHtml = (current) => `<section class="search-help-section">
  <h2>Browse good first issues by language</h2>
  <ul class="search-help-links">${LANGUAGE_PAGES.filter((page) => page !== current)
    .map((page) => `<li><a href="${page.path}">${escapeHtml(page.language)}</a></li>`)
    .join("")}</ul>
</section>`;

const commonHelp = (current) => `<section class="search-help-section">
  <h2>Questions beginners ask</h2>
  <div class="search-help-grid">${faqHtml(FAQ)}</div>
  <p class="search-help-more">New to this? Read <a href="${GUIDE_PATH}">how to make your first open-source contribution</a>.</p>
</section>
${browseHtml(current)}`;

const languageHelp = (page) => `<section class="search-help-section">
  <h2>Getting started with ${escapeHtml(page.language)}</h2>
  <p>${escapeHtml(page.summary)}</p>
  <p>Commands many ${escapeHtml(page.language)} projects use. Check each project's contributing guide first, because it may do things differently.</p>
  <ul class="search-help-commands">${page.commands
    .map(([label, command]) => `<li><span>${escapeHtml(label)}</span> <code>${escapeHtml(command)}</code></li>`)
    .join("")}</ul>
</section>`;

const shell = (content) =>
  `<main class="app"><nav class="navbar"><a class="navbar-brand" href="/">OpenSource Radar</a></nav>${content}</main>`;

const heroHtml = (heading, description) => `<section class="hero">
  <p class="eyebrow">YOUR OPEN-SOURCE JOURNEY STARTS HERE</p>
  <h1>${escapeHtml(heading)}</h1>
  <p class="description">${escapeHtml(description)}</p>
  ${NO_SCRIPT}
</section>`;

export function pageBody(page) {
  if (page === ABOUT) {
    return shell(`<article class="aboutpage"><header class="aboutpage-intro">
  <p class="eyebrow">ABOUT US</p>
  <h1>${escapeHtml(ABOUT.heading)}</h1>
  <p class="aboutpage-lead">${escapeHtml(ABOUT.lead)}</p>
</header></article>`);
  }
  if (page === GUIDE) {
    return shell(`<article class="aboutpage"><header class="aboutpage-intro">
  <p class="eyebrow">BEGINNER'S GUIDE</p>
  <h1>${escapeHtml(GUIDE.heading)}</h1>
  <p class="aboutpage-lead">${escapeHtml(GUIDE.lead)}</p>
</header>
<section class="aboutpage-section"><h2>The seven steps</h2><ol class="aboutpage-steps">${GUIDE.steps
      .map(
        ({ name, detail }) =>
          `<li><div><strong>${escapeHtml(name)}</strong> <span>${escapeHtml(detail)}</span></div></li>`,
      )
      .join("")}</ol></section>
<section class="aboutpage-section"><h2>If you get stuck</h2><div class="search-help-grid">${faqHtml(GUIDE.tips)}</div></section>
${browseHtml(null)}</article>`);
  }
  if (page === HOME) {
    return shell(`${heroHtml("Find your first open-source issue.", "Search open issues across all of GitHub.")}
<section class="search-help">${commonHelp(null)}</section>`);
  }
  return shell(`${heroHtml(page.heading, page.intro)}
<section class="search-help">${languageHelp(page)}${commonHelp(page)}</section>`);
}

function replaceOrThrow(html, pattern, replacement, what) {
  if (!pattern.test(html)) throw new Error(`prerender: could not find ${what} in index.html`);
  return html.replace(pattern, () => replacement);
}

// Fills the built index.html in for one page.
export function renderPage(template, page) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = escapeHtml(pageUrl(page));
  let html = template;
  html = replaceOrThrow(html, /<title>[^<]*<\/title>/, `<title>${title}</title>`, "the title");
  html = replaceOrThrow(
    html,
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${description}" />`,
    "the description",
  );
  html = replaceOrThrow(
    html,
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${url}" />`,
    "the canonical link",
  );
  html = replaceOrThrow(
    html,
    /<meta property="og:url" content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${url}" />`,
    "og:url",
  );
  // The home page keeps its own, shorter share text.
  if (page !== HOME) {
    html = replaceOrThrow(
      html,
      /<meta property="og:title" content="[^"]*"\s*\/>/,
      `<meta property="og:title" content="${title}" />`,
      "og:title",
    );
    html = replaceOrThrow(
      html,
      /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
      `<meta property="og:description" content="${description}" />`,
      "og:description",
    );
  }
  return replaceOrThrow(
    html,
    /<!-- prerender:start -->[\s\S]*<!-- prerender:end -->/,
    pageBody(page),
    "the prerender markers",
  );
}

export const sitemapXml = () => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ALL_PAGES.map(
  (page) => `  <url>
    <loc>${pageUrl(page)}</loc>
    <lastmod>${CONTENT_UPDATED}</lastmod>
  </url>`,
).join("\n")}
</urlset>
`;

export function prerender(outDir) {
  const template = fs.readFileSync(path.join(outDir, "index.html"), "utf8");
  for (const page of ALL_PAGES) {
    const file =
      page.path === "/" ? "index.html" : path.join(page.path.slice(1), "index.html");
    const target = path.join(outDir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, renderPage(template, page));
  }
  fs.writeFileSync(path.join(outDir, "sitemap.xml"), sitemapXml());
}
