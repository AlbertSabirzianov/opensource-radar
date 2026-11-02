import { loadSession } from "./_lib/auth.js";
import { githubHeaders } from "./_lib/github.js";
import {
  MESSAGE_MAX,
  MESSAGE_MIN,
  REPORT_TYPES,
  issueBody,
  issueTitle,
  reportConfig,
} from "./_lib/report.js";
import { getConfig, json } from "./_lib/session.js";
import { redis, storeAvailable } from "./_lib/store.js";

const REPORTS_PER_HOUR = 3;
const MAX_BODY_LENGTH = 10_000;

function clientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

// Counts reports per visitor (by IP) in a one-hour window. Without the
// database the form still works, protected only by the other checks.
async function overRateLimit(request) {
  if (!storeAvailable()) return false;

  const key = `report-rate:${clientIp(request)}`;
  try {
    const count = await redis(["INCR", key]);
    if (count === 1) await redis(["EXPIRE", key, 3600]);
    return count > REPORTS_PER_HOUR;
  } catch {
    return false;
  }
}

// POST /api/report: turns a report from the site's form into a GitHub issue.
export async function POST(request) {
  const { token, repo } = reportConfig();
  if (!token) return json({ error: "reports_unavailable" }, [], 503);

  // A JSON body forces a CORS preflight, so other sites can't post here.
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "json_required" }, [], 415);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_LENGTH) {
    return json({ error: "too_large" }, [], 413);
  }

  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, [], 400);
  }

  // Hidden "website" field: people never see it, simple bots fill it in.
  // Pretend success so the bot learns nothing.
  if (input.website) return json({ ok: true });

  const type = Object.hasOwn(REPORT_TYPES, input.type) ? input.type : null;
  const message = typeof input.message === "string" ? input.message.trim() : "";
  if (!type) return json({ error: "invalid_type" }, [], 400);
  if (message.length < MESSAGE_MIN || message.length > MESSAGE_MAX) {
    return json({ error: "invalid_message" }, [], 400);
  }

  if (await overRateLimit(request)) {
    return json({ error: "rate_limited" }, [], 429);
  }

  // Only a signed-in user's own session can add their username.
  let login = null;
  const config = getConfig();
  if (input.includeUsername && config.configured) {
    const { session } = await loadSession(request, config);
    login = session?.user?.login ?? null;
  }

  try {
    const response = await fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: { ...githubHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        title: issueTitle(type, message),
        body: issueBody({
          type,
          message,
          page: input.page,
          theme: input.theme,
          userAgent: request.headers.get("user-agent"),
          login,
        }),
      }),
    });
    if (!response.ok) {
      return json({ error: "github_error" }, [], 502);
    }

    const issue = await response.json();
    return json({ ok: true, number: issue.number, url: issue.html_url });
  } catch {
    return json({ error: "github_unreachable" }, [], 502);
  }
}
