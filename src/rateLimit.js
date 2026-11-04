// How the site behaves when GitHub says "too many searches, wait a bit".

export const MAX_LIMIT_RETRIES = 5;
const FALLBACK_WAIT_SECONDS = 60;
const MAX_WAIT_SECONDS = 15 * 60;

// A spread of a few seconds, so everyone waiting on the same network (a class
// scanning a QR code, say) doesn't retry at the same instant and use the new
// allowance up together.
const MIN_EXTRA_MS = 500;
const MAX_EXTRA_MS = 5000;

export function isRateLimited(response) {
  if (response.status === 429) return true;
  if (response.status !== 403) return false;
  return (
    response.headers.get("retry-after") !== null ||
    response.headers.get("x-ratelimit-remaining") === "0"
  );
}

export function limitWaitSeconds(headers, now = Date.now()) {
  const retryAfter = Number(headers.get("retry-after"));
  const reset = Number(headers.get("x-ratelimit-reset"));
  let seconds = FALLBACK_WAIT_SECONDS;
  if (retryAfter > 0) seconds = retryAfter;
  else if (reset > 0) seconds = reset - now / 1000;
  return Math.min(MAX_WAIT_SECONDS, Math.max(1, Math.ceil(seconds)));
}

export function retryDelayMs(waitSeconds, random = Math.random) {
  return waitSeconds * 1000 + MIN_EXTRA_MS + random() * (MAX_EXTRA_MS - MIN_EXTRA_MS);
}

// One request per address at a time: a repeat while the first is on its way
// shares its answer instead of spending another of GitHub's limited searches.
const inFlight = new Map();

export function fetchShared(url, fetcher = fetch) {
  if (!inFlight.has(url)) {
    const request = fetcher(url).finally(() => inFlight.delete(url));
    inFlight.set(url, request);
  }
  return inFlight.get(url).then((response) => response.clone());
}
