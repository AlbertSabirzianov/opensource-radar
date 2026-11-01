import {
  STATE_COOKIE,
  STATE_MAX_AGE,
  getConfig,
  getOrigin,
  randomToken,
  redirect,
  setCookie,
} from "../_lib/session.js";

// GET /auth/login: sends the user to GitHub's "Authorize" page.
export function GET(request) {
  const config = getConfig();
  if (!config.configured) {
    return new Response("GitHub sign-in isn't set up yet.", { status: 503 });
  }

  // Random value GitHub sends back unchanged; the callback rejects any
  // sign-in whose state doesn't match the cookie (stops login CSRF).
  const state = randomToken();
  const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
  authorizeUrl.searchParams.set("client_id", config.clientId);
  authorizeUrl.searchParams.set(
    "redirect_uri",
    `${getOrigin(request)}/auth/callback`,
  );
  authorizeUrl.searchParams.set("state", state);
  // No "scope": the token can only read public information.

  return redirect(authorizeUrl.toString(), [
    setCookie(request, STATE_COOKIE, state, STATE_MAX_AGE),
  ]);
}
