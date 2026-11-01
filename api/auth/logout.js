import { revokeToken } from "../_lib/github.js";
import {
  SESSION_COOKIE,
  clearCookie,
  getConfig,
  json,
  readCookie,
  unseal,
} from "../_lib/session.js";

// POST /auth/logout: revokes the GitHub token and clears the session cookie.
// POST (not GET) so another site can't sign people out with a plain link.
export async function POST(request) {
  const config = getConfig();
  const raw = readCookie(request, SESSION_COOKIE);

  if (raw && config.configured) {
    const session = await unseal(raw, config.sessionSecret);
    if (session?.accessToken) {
      await revokeToken(config, session.accessToken);
    }
  }

  return json({ ok: true }, [clearCookie(request, SESSION_COOKIE)]);
}
