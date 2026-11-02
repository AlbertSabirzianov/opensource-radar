// Turns an issue's Markdown description into a short plain-text preview.
//
// Issue text comes from anyone on GitHub and can be up to 65,536 characters,
// so only the start is cleaned, and every pattern is safe on hostile input:
// no "\s*" that can run across lines and no unbounded "[^\]]+" scans. Those
// made a crafted description freeze the page for seconds.

const SOURCE_LENGTH = 1500;
const PREVIEW_LENGTH = 180;

export function previewText(description) {
  const clean = (description || "No description provided.")
    .slice(0, SOURCE_LENGTH)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`\n]*`/g, " ")
    .replace(/!\[([^\]\n]{0,200})\]\([^)\n]{1,500}\)/g, "$1")
    .replace(/\[([^\]\n]{1,200})\]\([^)\n]{1,500}\)/g, "$1")
    .replace(/<[^>\n]{0,200}>/g, " ")
    .replace(/^#{1,6}[ \t]+/gm, "")
    .replace(/^[ \t]*[-*+][ \t]+/gm, "")
    .replace(/^[ \t]*\d+\.[ \t]+/gm, "")
    .replace(/[*_~>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return clean.length > PREVIEW_LENGTH
    ? clean.slice(0, PREVIEW_LENGTH).trimEnd() + "..."
    : clean;
}
