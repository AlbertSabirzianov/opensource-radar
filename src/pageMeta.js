// Each page's HTML already has the right details (see scripts/prerender.js).
// This keeps them right as a visitor moves between pages without a reload.
import { SITE_URL } from "./seoPages";

const description = () => document.head.querySelector('meta[name="description"]');
const canonical = () => document.head.querySelector('link[rel="canonical"]');
const ogUrl = () => document.head.querySelector('meta[property="og:url"]');

export function setPageMeta(page) {
  const url = `${SITE_URL}${page.path}`;
  document.title = page.title;
  description()?.setAttribute("content", page.description);
  canonical()?.setAttribute("href", url);
  ogUrl()?.setAttribute("content", url);
}
