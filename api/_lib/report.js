// Settings and formatting for the in-site "Report a problem" form.
// Reports become issues in the project's GitHub repo, created with a token
// that can only open issues there (REPORT_GITHUB_TOKEN).

export const REPORT_TYPES = {
  bug: "Bug",
  wrong_info: "Wrong or outdated information",
  suggestion: "Suggestion",
  other: "Other",
};

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 2000;

export function reportConfig() {
  return {
    token: process.env.REPORT_GITHUB_TOKEN || "",
    repo: process.env.REPORT_REPO || "opensource-radar/opensource-radar",
  };
}

export function reportsAvailable() {
  return Boolean(reportConfig().token);
}

// One line of plain text: no newlines or Markdown/HTML characters, and "@"
// can't form a mention (GitHub would notify that user).
function oneLine(value, max) {
  return String(value || "")
    .replace(/[`<>[\]|*_#]/g, "")
    .replace(/\s+/g, " ")
    .replace(/@/g, "@​")
    .trim()
    .slice(0, max);
}

export function issueTitle(type, message) {
  const preview = oneLine(message, 60) || "No description";
  return `[User report] ${REPORT_TYPES[type]}: ${preview}`;
}

export function issueBody({ type, message, page, theme, userAgent, login }) {
  // A code fence longer than any run of backticks in the message keeps it
  // as plain text: no Markdown tricks, links, images or @mentions.
  const longestRun = Math.max(
    0,
    ...(message.match(/`+/g) || []).map((run) => run.length),
  );
  const fence = "`".repeat(Math.max(3, longestRun + 1));

  return [
    `**Type:** ${REPORT_TYPES[type]}`,
    `**Reported by:** ${login ? `@${login}` : "A visitor (not signed in)"}`,
    "",
    "**What happened**",
    "",
    `${fence}text`,
    message,
    fence,
    "",
    "<details><summary>Details</summary>",
    "",
    `- Page: ${oneLine(page, 200) || "/"}`,
    `- Theme: ${oneLine(theme, 20) || "unknown"}`,
    `- Browser: ${oneLine(userAgent, 300) || "unknown"}`,
    `- Sent: ${new Date().toISOString()}`,
    "",
    "</details>",
    "",
    "_Sent from the in-site report form._",
  ].join("\n");
}
