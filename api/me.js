import { loadSession } from "./_lib/auth.js";
import { getConfig, json } from "./_lib/session.js";

// GET /api/me: who is signed in. Never returns the token itself.
export async function GET(request) {
  const config = getConfig();
  if (!config.configured) {
    return json({ signInAvailable: false, user: null });
  }

  const { session, cookies } = await loadSession(request, config);
  return json(
    { signInAvailable: true, user: session?.user ?? null },
    cookies,
  );
}
