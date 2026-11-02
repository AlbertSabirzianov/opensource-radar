// Tiny client for Upstash Redis's REST API (the database Vercel connects
// from its Storage tab). No SDK needed: each command is one HTTPS request.
//
// Vercel's Upstash integration sets KV_REST_API_URL / KV_REST_API_TOKEN;
// a database created directly on upstash.com uses the UPSTASH_ names.

function storeConfig() {
  return {
    url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
    token:
      process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "",
  };
}

export function storeAvailable() {
  const { url, token } = storeConfig();
  return Boolean(url && token);
}

// Runs one Redis command, e.g. redis(["GET", "key"]). Throws on failure.
export async function redis(command) {
  const { url, token } = storeConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.error) {
    throw new Error(`Database request failed (${data?.error || response.status})`);
  }
  return data.result;
}
