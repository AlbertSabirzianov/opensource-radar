import { refreshTokens } from "./github.js";
import {
  SESSION_COOKIE,
  clearCookie,
  readCookie,
  seal,
  sessionMaxAge,
  setCookie,
  unseal,
} from "./session.js";

const REFRESH_MARGIN = 60 * 1000;

// Reads the signed-in session from the cookie, renewing the GitHub token
// first if it's about to expire (expiring user tokens last about 8 hours).
// Returns the session (or null) plus any Set-Cookie headers to send back.
export async function loadSession(request, config) {
  const raw = readCookie(request, SESSION_COOKIE);
  if (!raw) return { session: null, cookies: [] };

  const signedOut = {
    session: null,
    cookies: [clearCookie(request, SESSION_COOKIE)],
  };
  const session = await unseal(raw, config.sessionSecret);
  if (!session?.user || !session.accessToken) return signedOut;

  const now = Date.now();
  if (!session.accessExpiresAt || now < session.accessExpiresAt - REFRESH_MARGIN) {
    return { session, cookies: [] };
  }

  const refreshUsable =
    session.refreshToken &&
    (!session.refreshExpiresAt || now < session.refreshExpiresAt);
  const tokens = refreshUsable
    ? await refreshTokens(config, session.refreshToken)
    : null;
  if (!tokens) return signedOut;

  const renewed = { ...tokens, user: session.user };
  return {
    session: renewed,
    cookies: [
      setCookie(
        request,
        SESSION_COOKIE,
        await seal(renewed, config.sessionSecret),
        sessionMaxAge(tokens),
      ),
    ],
  };
}
