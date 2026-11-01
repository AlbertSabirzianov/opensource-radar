import { loadSession } from "./_lib/auth.js";
import { githubHeaders } from "./_lib/github.js";
import { getConfig, json } from "./_lib/session.js";

const GITHUB_API = "https://api.github.com";

// Only the read-only endpoints the site needs, so the signed-in user's token
// can't be used for anything else through this proxy.
const ALLOWED_PATHS = [
  /^\/repos\/[\w.-]+\/[\w.-]+\/issues$/,
  /^\/rate_limit$/,
  /^\/search\/issues$/,
  /^\/user\/repos$/,
];

const FORWARDED_HEADERS = [
  "content-type",
  "link",
  "retry-after",
  "x-ratelimit-limit",
  "x-ratelimit-remaining",
  "x-ratelimit-reset",
  "x-ratelimit-resource",
  "x-ratelimit-used",
];

// GET /api/github?path=/repos/owner/name/issues?state=open
// Calls GitHub with the signed-in user's token (5,000 requests an hour each,
// instead of 60 an hour shared by everyone on the same network).
export async function GET(request) {
  const path = new URL(request.url).searchParams.get("path") || "";

  // "//host" would make URL() switch to another site; require one leading "/".
  const target =
    path.startsWith("/") && !path.startsWith("//")
      ? new URL(path, GITHUB_API)
      : null;
  if (
    !target ||
    target.origin !== GITHUB_API ||
    !ALLOWED_PATHS.some((pattern) => pattern.test(target.pathname))
  ) {
    return json({ error: "not_allowed" }, [], 400);
  }

  const config = getConfig();
  const { session, cookies } = config.configured
    ? await loadSession(request, config)
    : { session: null, cookies: [] };
  if (!session) return json({ error: "signed_out" }, cookies, 401);

  let upstream;
  try {
    upstream = await fetch(target, {
      headers: githubHeaders(session.accessToken),
    });
  } catch {
    return json({ error: "github_unreachable" }, cookies, 502);
  }

  const headers = new Headers({ "Cache-Control": "private, no-store" });
  for (const name of FORWARDED_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));

  return new Response(await upstream.arrayBuffer(), {
    status: upstream.status,
    headers,
  });
}
