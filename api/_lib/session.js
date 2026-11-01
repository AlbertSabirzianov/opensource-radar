// Shared helpers for the GitHub sign-in functions. Vercel doesn't turn files
// in folders starting with "_" into routes, so nothing here is public.

export const STATE_COOKIE = "osr_oauth_state";
export const SESSION_COOKIE = "osr_session";
export const STATE_MAX_AGE = 10 * 60;
const FALLBACK_SESSION_MAX_AGE = 30 * 24 * 60 * 60;
const MIN_SESSION_SECRET_LENGTH = 32;

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function getConfig() {
  const clientId = process.env.GITHUB_CLIENT_ID || "";
  const clientSecret = process.env.GITHUB_CLIENT_SECRET || "";
  const sessionSecret = process.env.SESSION_SECRET || "";

  return {
    clientId,
    clientSecret,
    sessionSecret,
    configured: Boolean(
      clientId &&
        clientSecret &&
        sessionSecret.length >= MIN_SESSION_SECRET_LENGTH,
    ),
  };
}

function isSecure(request) {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  return (forwardedProto || new URL(request.url).protocol.slice(0, -1)) ===
    "https";
}

export function getOrigin(request) {
  const url = new URL(request.url);
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    url.host;

  return `${isSecure(request) ? "https" : "http"}://${host}`;
}

// On HTTPS the "__Host-" prefix makes the browser refuse the cookie unless it
// is Secure, has Path=/ and no Domain. Plain-HTTP localhost can't use it.
function cookieName(request, name) {
  return isSecure(request) ? `__Host-${name}` : name;
}

export function readCookie(request, name) {
  const target = cookieName(request, name);
  const header = request.headers.get("cookie") || "";

  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    if (part.slice(0, separator).trim() === target) {
      return part.slice(separator + 1).trim();
    }
  }

  return null;
}

export function setCookie(request, name, value, maxAge) {
  const attributes = [
    `${cookieName(request, name)}=${value}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];
  if (isSecure(request)) attributes.push("Secure");

  return attributes.join("; ");
}

export function clearCookie(request, name) {
  return setCookie(request, name, "", 0);
}

export function sessionMaxAge(tokens) {
  return tokens.refreshExpiresAt
    ? (tokens.refreshExpiresAt - Date.now()) / 1000
    : FALLBACK_SESSION_MAX_AGE;
}

export function randomToken() {
  return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString(
    "base64url",
  );
}

async function getKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// Encrypts (AES-GCM) so the browser can hold the session without being able
// to read the GitHub token inside it or tamper with it.
export async function seal(data, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await getKey(secret),
    encoder.encode(JSON.stringify(data)),
  );

  return Buffer.concat([iv, new Uint8Array(ciphertext)]).toString(
    "base64url",
  );
}

export async function unseal(value, secret) {
  try {
    const bytes = Buffer.from(value, "base64url");
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: bytes.subarray(0, 12) },
      await getKey(secret),
      bytes.subarray(12),
    );
    return JSON.parse(decoder.decode(plaintext));
  } catch {
    return null;
  }
}

export function redirect(location, cookies = []) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return new Response(null, { status: 302, headers });
}

export function json(data, cookies = [], status = 200) {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  cookies.forEach((cookie) => headers.append("Set-Cookie", cookie));
  return new Response(JSON.stringify(data), { status, headers });
}
