import { loadSession } from "./_lib/auth.js";
import { reportsAvailable } from "./_lib/report.js";
import { getConfig, json } from "./_lib/session.js";
import { storeAvailable } from "./_lib/store.js";

// GET /api/me: who is signed in, plus which optional features the server is
// set up for. Never returns the token itself.
export async function GET(request) {
  const config = getConfig();
  const features = {
    savedSync: config.configured && storeAvailable(),
    reportsAvailable: reportsAvailable(),
    // Project details on cards for visitors who aren't signed in.
    projectInfo: Boolean(process.env.GITHUB_READ_TOKEN),
  };

  if (!config.configured) {
    return json({ signInAvailable: false, user: null, ...features });
  }

  const { session, cookies } = await loadSession(request, config);
  return json(
    { signInAvailable: true, user: session?.user ?? null, ...features },
    cookies,
  );
}
