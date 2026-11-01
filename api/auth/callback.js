import { exchangeCode, fetchUser } from "../_lib/github.js";
import {
  SESSION_COOKIE,
  STATE_COOKIE,
  clearCookie,
  getConfig,
  getOrigin,
  readCookie,
  redirect,
  seal,
  sessionMaxAge,
  setCookie,
} from "../_lib/session.js";

// GET /auth/callback: GitHub redirects here after the user authorizes.
export async function GET(request) {
  const config = getConfig();
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const savedState = readCookie(request, STATE_COOKIE);
  const clearState = clearCookie(request, STATE_COOKIE);
  const fail = () => redirect("/?signin=failed", [clearState]);

  // Covers a cancelled authorization (no code), an expired or missing state
  // cookie, and a state that doesn't match (possible forged request).
  if (!config.configured || !code || !state || state !== savedState) {
    return fail();
  }

  const tokens = await exchangeCode(
    config,
    code,
    `${getOrigin(request)}/auth/callback`,
  );
  if (!tokens) return fail();

  const user = await fetchUser(tokens.accessToken);
  if (!user) return fail();

  const session = await seal({ ...tokens, user }, config.sessionSecret);

  return redirect("/", [
    clearState,
    setCookie(request, SESSION_COOKIE, session, sessionMaxAge(tokens)),
  ]);
}
