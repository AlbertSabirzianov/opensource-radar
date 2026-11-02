import { loadSession } from "./_lib/auth.js";
import { getConfig, json } from "./_lib/session.js";
import { redis, storeAvailable } from "./_lib/store.js";

const MAX_SAVED = 200;
const MAX_BODY_LENGTH = 400_000;

const text = (value, max) =>
  typeof value === "string" ? value.slice(0, max) : "";

// Only keep the fields the site shows, with sane sizes, so the stored list
// can't be used to park arbitrary data in the database.
function cleanIssue(issue) {
  if (!issue || !Number.isSafeInteger(issue.id)) return null;

  const url = text(issue.url, 300);
  if (!url.startsWith("https://github.com/")) return null;

  return {
    id: issue.id,
    title: text(issue.title, 300) || "Untitled issue",
    description: text(issue.description, 1000),
    labels: Array.isArray(issue.labels)
      ? issue.labels.slice(0, 20).map((label) => text(label, 100))
      : [],
    label: text(issue.label, 400),
    language: text(issue.language, 50),
    repo: text(issue.repo, 120),
    url,
    updatedAt: text(issue.updatedAt, 40),
    savedAt: Number.isFinite(issue.savedAt) ? issue.savedAt : Date.now(),
  };
}

async function signedInUser(request) {
  const config = getConfig();
  if (!config.configured) return { user: null, cookies: [] };

  const { session, cookies } = await loadSession(request, config);
  return { user: session?.user ?? null, cookies };
}

const keyFor = (user) => `saved:${user.login.toLowerCase()}`;

// GET /api/saved: the signed-in user's saved issues from the database.
export async function GET(request) {
  if (!storeAvailable()) return json({ error: "sync_unavailable" }, [], 503);

  const { user, cookies } = await signedInUser(request);
  if (!user) return json({ error: "signed_out" }, cookies, 401);

  try {
    const stored = await redis(["GET", keyFor(user)]);
    const items = stored ? JSON.parse(stored) : [];
    return json({ items: Array.isArray(items) ? items : [] }, cookies);
  } catch {
    return json({ error: "database_error" }, cookies, 502);
  }
}

// PUT /api/saved: replaces the signed-in user's saved list.
// Requiring a JSON body means another site can't send this request with the
// user's cookie (browsers block it without a CORS preflight we never allow).
export async function PUT(request) {
  if (!storeAvailable()) return json({ error: "sync_unavailable" }, [], 503);
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "json_required" }, [], 415);
  }

  const { user, cookies } = await signedInUser(request);
  if (!user) return json({ error: "signed_out" }, cookies, 401);

  const body = await request.text();
  if (body.length > MAX_BODY_LENGTH) {
    return json({ error: "too_large" }, cookies, 413);
  }

  let items;
  try {
    items = JSON.parse(body).items;
  } catch {
    return json({ error: "invalid_json" }, cookies, 400);
  }
  if (!Array.isArray(items)) return json({ error: "invalid_items" }, cookies, 400);

  const seen = new Set();
  const clean = items
    .map(cleanIssue)
    .filter((issue) => issue && !seen.has(issue.id) && seen.add(issue.id))
    .slice(0, MAX_SAVED);

  try {
    await redis(["SET", keyFor(user), JSON.stringify(clean)]);
    return json({ items: clean }, cookies);
  } catch {
    return json({ error: "database_error" }, cookies, 502);
  }
}
