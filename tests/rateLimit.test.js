import { describe, expect, it } from "vitest";
import {
  fetchShared,
  isRateLimited,
  limitWaitSeconds,
  retryDelayMs,
} from "../src/rateLimit.js";

const response = (status, headers = {}) => new Response("{}", { status, headers });

describe("isRateLimited", () => {
  it("recognises GitHub's limit responses", () => {
    expect(isRateLimited(response(429))).toBe(true);
    expect(isRateLimited(response(403, { "x-ratelimit-remaining": "0" }))).toBe(true);
    expect(isRateLimited(response(403, { "retry-after": "30" }))).toBe(true);
  });

  it("doesn't treat other responses as a limit, so they're never retried", () => {
    expect(isRateLimited(response(403, { "x-ratelimit-remaining": "4" }))).toBe(false);
    expect(isRateLimited(response(403))).toBe(false);
    expect(isRateLimited(response(422))).toBe(false);
    expect(isRateLimited(response(200))).toBe(false);
  });
});

describe("limitWaitSeconds", () => {
  const now = 1_000_000_000;
  const headers = (values) => new Headers(values);

  it("counts down to GitHub's reset time", () => {
    expect(limitWaitSeconds(headers({ "x-ratelimit-reset": String(now / 1000 + 50) }), now)).toBe(50);
  });

  it("prefers retry-after", () => {
    const both = { "retry-after": "20", "x-ratelimit-reset": String(now / 1000 + 50) };
    expect(limitWaitSeconds(headers(both), now)).toBe(20);
  });

  it("waits a minute when GitHub gives no time", () => {
    expect(limitWaitSeconds(headers({}), now)).toBe(60);
  });

  it("never waits zero seconds, or absurdly long", () => {
    expect(limitWaitSeconds(headers({ "x-ratelimit-reset": String(now / 1000 - 5) }), now)).toBe(1);
    expect(limitWaitSeconds(headers({ "retry-after": "99999" }), now)).toBe(900);
  });
});

describe("retryDelayMs", () => {
  it("waits past the reset, spreading visitors over a few seconds", () => {
    expect(retryDelayMs(10, () => 0)).toBe(10_500);
    expect(retryDelayMs(10, () => 1)).toBe(15_000);
  });
});

describe("fetchShared", () => {
  it("sends one request for repeats, and each caller can read the answer", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response('{"total_count":7}');
    };
    const [a, b] = await Promise.all([
      fetchShared("https://x/a", fetcher),
      fetchShared("https://x/a", fetcher),
    ]);
    expect(calls).toBe(1);
    expect(await a.json()).toEqual({ total_count: 7 });
    expect(await b.json()).toEqual({ total_count: 7 });
  });

  it("asks again once the first request has finished", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return new Response("{}");
    };
    await fetchShared("https://x/b", fetcher);
    await fetchShared("https://x/b", fetcher);
    expect(calls).toBe(2);
  });

  it("forgets failed requests so they can be retried", async () => {
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return new Response("{}");
    };
    await expect(fetchShared("https://x/c", fetcher)).rejects.toThrow("offline");
    await expect(fetchShared("https://x/c", fetcher)).resolves.toBeInstanceOf(Response);
    expect(calls).toBe(2);
  });
});
