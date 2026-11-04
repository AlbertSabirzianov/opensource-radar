// index.html holds the home page's details. This swaps them for the About
// page, so search engines treat it as its own page rather than a copy of home.
const SITE_URL = "https://opensource-radar.com";

const ABOUT = {
  title: "About OpenSource Radar – Find Your First Open-Source Issue",
  description:
    "Why OpenSource Radar exists, how to find a good first issue and make your first open-source contribution, and what the site stores about you.",
  url: `${SITE_URL}/about`,
};

const description = () => document.head.querySelector('meta[name="description"]');
const canonical = () => document.head.querySelector('link[rel="canonical"]');
const ogUrl = () => document.head.querySelector('meta[property="og:url"]');

const HOME = {
  title: document.title,
  description: description()?.content,
  url: canonical()?.href,
};

export function setPageMeta(route) {
  const page = route === "about" ? ABOUT : HOME;
  document.title = page.title;
  description()?.setAttribute("content", page.description);
  canonical()?.setAttribute("href", page.url);
  ogUrl()?.setAttribute("content", page.url);
}
