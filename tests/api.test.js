import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as proxy } from "../api/github.js";
import { GET as callback } from "../api/auth/callback.js";
import { GET as login } from "../api/auth/login.js";
import { GET as me } from "../api/me.js";
import { POST as report } from "../api/report.js";
import { GET as getSaved, PUT as putSaved } from "../api/saved.js";
import { seal, unseal } from "../api/_lib/session.js";

const SESSION_SECRET = "test-session-secret-0123456789abcdef0123456789abcdef";
const REDIS_URL = "https://fake-redis.test";

// A fake Upstash database and a fake GitHub issues API.
let db;
let issues;

function fakeFetch(url, init = {}) {
  url = String(url);

  if (url === REDIS_URL) {
    const [command, key, value] = JSON.parse(init.body);
    if (command === "GET") return Response.json({ result: db.get(key) ?? null });
    if (command === "SET") {
      db.set(key, value);
      return Response.json({ result: "OK" });
    }
    if (command === "INCR") {
      const count = (Number(db.get(key)) || 0) + 1;
      db.set(key, String(count));
      return Response.json({ result: count });
    }
    if (command === "EXPIRE") return Response.json({ result: 1 });
  }

  if (url.endsWith("/repos/opensource-radar/opensource-radar/issues")) {
    issues.push({ auth: init.headers.Authorization, ...JSON.parse(init.body) });
    const number = 100 + issues.length;
    return Response.json(
      {
        number,
        html_url: `https://github.com/opensource-radar/opensource-radar/issues/${number}`,
      },
      { status: 201 },
    );
  }

  throw new Error(`Unexpected request in test: ${url}`);
}

const request = (path, { method = "GET", body, headers = {} } = {}) =>
  new Request(`http://localhost${path}`, { method, body, headers });

async function sessionCookie() {
  const session = {
    accessToken: "x",
    refreshToken: null,
    accessExpiresAt: null,
    refreshExpiresAt: null,
    user: { login: "Octocat", name: "The Octocat", avatarUrl: "https://avatars.githubusercontent.com/u/1" },
  };
  return `osr_session=${await seal(session, SESSION_SECRET)}`;
}

beforeEach(() => {
  db = new Map();
  issues = [];
  vi.stubEnv("GITHUB_CLIENT_ID", "test-client-id");
  vi.stubEnv("GITHUB_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("SESSION_SECRET", SESSION_SECRET);
  vi.stubEnv("KV_REST_API_URL", REDIS_URL);
  vi.stubEnv("KV_REST_API_TOKEN", "fake-token");
  vi.stubEnv("REPORT_GITHUB_TOKEN", "fake-report-token");
  vi.stubGlobal("fetch", vi.fn(fakeFetch));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("session", () => {
  it("encrypts the session so the token can't be read or forged", async () => {
    const sealed = await seal({ accessToken: "secret-token" }, SESSION_SECRET);
    expect(sealed).not.toContain("secret-token");
    expect(await unseal(sealed, SESSION_SECRET)).toEqual({ accessToken: "secret-token" });
    expect(await unseal(sealed, "a-different-secret-0123456789abcdef")).toBeNull();
    expect(await unseal("tampered", SESSION_SECRET)).toBeNull();
  });
});

describe("sign-in", () => {
  it("sends people to GitHub with a random state and no scopes", () => {
    const response = login(request("/auth/login"));
    const location = new URL(response.headers.get("location"));
    expect(location.origin + location.pathname).toBe("https://github.com/login/oauth/authorize");
    expect(location.searchParams.get("redirect_uri")).toBe("http://localhost/auth/callback");
    expect(location.searchParams.get("state")).toHaveLength(43);
    expect(location.searchParams.has("scope")).toBe(false);
    expect(response.headers.get("set-cookie")).toMatch(/HttpOnly; SameSite=Lax/);
  });

  it("rejects a callback whose state doesn't match", async () => {
    const response = await callback(
      request("/auth/callback?code=x&state=forged", {
        headers: { cookie: "osr_oauth_state=real" },
      }),
    );
    expect(response.headers.get("location")).toBe("/?signin=failed");
  });

  it("is hidden when sign-in isn't set up", async () => {
    vi.stubEnv("GITHUB_CLIENT_SECRET", "");
    const data = await (await me(request("/api/me"))).json();
    expect(data.signInAvailable).toBe(false);
  });
});

describe("GitHub proxy", () => {
  it.each([
    "//evil.com/x",
    "https://evil.com",
    "/user",
    "/user/emails",
    "/repos/a/b",
    "/repos/a/b/issues/../../../user",
    "/repos/a/b/issues/%2e%2e/%2e%2e/%2e%2e/user",
    "relative",
  ])("refuses %s", async (path) => {
    const response = await proxy(request(`/api/github?path=${encodeURIComponent(path)}`));
    expect(response.status).toBe(400);
  });

  it("requires sign-in for allowed paths", async () => {
    const response = await proxy(request(`/api/github?path=${encodeURIComponent("/search/issues?q=x")}`));
    expect(response.status).toBe(401);
  });
});

describe("saved issues", () => {
  const put = async (body, headers) =>
    putSaved(
      request("/api/saved", {
        method: "PUT",
        body: JSON.stringify(body),
        headers: { "content-type": "application/json", ...headers },
      }),
    );

  it("needs sign-in", async () => {
    expect((await getSaved(request("/api/saved"))).status).toBe(401);
  });

  it("stores only valid, de-duplicated issues and trims them", async () => {
    const cookie = await sessionCookie();
    const response = await put(
      {
        items: [
          { id: 1, title: "A", description: "x".repeat(5000), url: "https://github.com/a/b/issues/1", extra: "dropped" },
          { id: 1, title: "duplicate", url: "https://github.com/x/y/issues/1" },
          { id: 2, title: "evil", url: "javascript:alert(1)" },
          { id: "3", title: "bad id", url: "https://github.com/x/y/issues/3" },
        ],
      },
      { cookie },
    );
    const { items } = await response.json();
    expect(items.map((item) => item.id)).toEqual([1]);
    expect(items[0].description).toHaveLength(1000);
    expect(items[0]).not.toHaveProperty("extra");

    const saved = await (await getSaved(request("/api/saved", { headers: { cookie } }))).json();
    expect(saved.items).toHaveLength(1);
    expect(db.has("saved:octocat")).toBe(true);
  });

  it("only accepts JSON writes", async () => {
    const cookie = await sessionCookie();
    const response = await putSaved(
      request("/api/saved", { method: "PUT", body: "{}", headers: { cookie } }),
    );
    expect(response.status).toBe(415);
  });

  it("is unavailable without a database", async () => {
    vi.stubEnv("KV_REST_API_URL", "");
    expect((await getSaved(request("/api/saved"))).status).toBe(503);
  });
});

describe("report form", () => {
  const send = (body, headers = {}) =>
    report(
      request("/api/report", {
        method: "POST",
        body: JSON.stringify(body),
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "1.2.3.4",
          "user-agent": "TestBrowser/1.0",
          ...headers,
        },
      }),
    );

  it("rejects bad input", async () => {
    expect((await send({ type: "hack", message: "this is long enough" })).status).toBe(400);
    expect((await send({ type: "bug", message: "short" })).status).toBe(400);
  });

  it("pretends to accept bots but creates nothing", async () => {
    const response = await send({ type: "bug", message: "bot spam message", website: "spam" });
    expect(response.status).toBe(200);
    expect(issues).toHaveLength(0);
  });

  it("creates a GitHub issue without live mentions", async () => {
    const message = "Filter broken @torvalds ```` <script>alert(1)</script>";
    const response = await send(
      { type: "wrong_info", message, includeUsername: true },
      { cookie: await sessionCookie() },
    );
    expect((await response.json()).number).toBe(101);

    const [issue] = issues;
    expect(issue.auth).toBe("Bearer fake-report-token");
    expect(issue.title).toMatch(/^\[User report\] Wrong or outdated information: /);
    expect(issue.title).not.toContain("@torvalds");
    expect(issue.body).toContain("`````text\n" + message + "\n`````");
    expect(issue.body).toContain("**Reported by:** @Octocat");
  });

  it("doesn't let visitors claim a username", async () => {
    await send({ type: "bug", message: "a report from a visitor", includeUsername: true });
    expect(issues[0].body).toContain("A visitor (not signed in)");
  });

  it("limits each visitor to 3 reports an hour", async () => {
    for (let i = 0; i < 3; i += 1) {
      expect((await send({ type: "other", message: `report number ${i}` })).status).toBe(200);
    }
    expect((await send({ type: "other", message: "the fourth report" })).status).toBe(429);
    expect(
      (await send({ type: "other", message: "someone else" }, { "x-forwarded-for": "5.6.7.8" })).status,
    ).toBe(200);
  });
});
