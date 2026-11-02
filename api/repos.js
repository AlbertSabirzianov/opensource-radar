import { loadSession } from "./_lib/auth.js";
import { fetchRepositories } from "./_lib/github.js";
import { getConfig, json } from "./_lib/session.js";
import { redis, storeAvailable } from "./_lib/store.js";

const MAX_NAMES = 10;
const REPO_PATTERN = /^[\w.-]+\/[\w.-]+$/;
const CACHE_SECONDS = 24 * 60 * 60;
const QUIET_AFTER_DAYS = 180;
// Only for visitors using the shared server token.
const LOOKUPS_PER_MINUTE = 30;

function clientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

async function overRateLimit(request) {
  if (!storeAvailable()) return false;

  const key = `repos-rate:${clientIp(request)}`;
  try {
    const count = await redis(["INCR", key]);
    if (count === 1) await redis(["EXPIRE", key, 60]);
    return count > LOOKUPS_PER_MINUTE;
  } catch {
    return false;
  }
}

function toProjectInfo(repo) {
  if (!repo) return { missing: true };

  const quietSince = Date.now() - QUIET_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return {
    stars: repo.stargazerCount,
    pushedAt: repo.pushedAt,
    archived: repo.isArchived,
    quiet: !repo.pushedAt || new Date(repo.pushedAt).getTime() < quietSince,
    contributingUrl: repo.contributingGuidelines?.url || null,
  };
}

// GET /api/repos?names=owner/repo,owner/repo
// Stars, last activity and contributing guide for the projects on screen.
// Uses the signed-in user's token, or an optional read-only server token
// (GITHUB_READ_TOKEN) for visitors. Answers are cached for a day.
export async function GET(request) {
  const names = [
    ...new Set(
      (new URL(request.url).searchParams.get("names") || "")
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  ];
  if (
    names.length === 0 ||
    names.length > MAX_NAMES ||
    !names.every((name) => REPO_PATTERN.test(name))
  ) {
    return json({ error: "invalid_names" }, [], 400);
  }

  const config = getConfig();
  const { session, cookies } = config.configured
    ? await loadSession(request, config)
    : { session: null, cookies: [] };

  let token = session?.accessToken;
  if (!token) {
    token = process.env.GITHUB_READ_TOKEN || "";
    if (!token) return json({ error: "unavailable" }, cookies, 503);
    if (await overRateLimit(request)) {
      return json({ error: "rate_limited" }, cookies, 429);
    }
  }

  const keys = names.map((name) => `repo:${name.toLowerCase()}`);
  const repos = {};
  let missing = names;

  if (storeAvailable()) {
    try {
      const cached = await redis(["MGET", ...keys]);
      missing = names.filter((name, index) => {
        if (!cached?.[index]) return true;
        repos[name] = JSON.parse(cached[index]);
        return false;
      });
    } catch {
      missing = names;
    }
  }

  if (missing.length > 0) {
    let found;
    try {
      found = await fetchRepositories(token, missing);
    } catch {
      return json({ repos, error: "github_error" }, cookies, 502);
    }

    await Promise.all(
      missing.map(async (name, index) => {
        repos[name] = toProjectInfo(found[index]);
        if (!storeAvailable()) return;
        try {
          await redis([
            "SET",
            `repo:${name.toLowerCase()}`,
            JSON.stringify(repos[name]),
            "EX",
            CACHE_SECONDS,
          ]);
        } catch {
          // Not cached this time; the next lookup asks GitHub again.
        }
      }),
    );
  }

  return json({ repos }, cookies);
}
