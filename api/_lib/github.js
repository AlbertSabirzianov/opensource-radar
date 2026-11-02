// Calls to GitHub's OAuth and REST APIs used by the sign-in functions.

const TOKEN_URL = "https://github.com/login/oauth/access_token";

export function githubHeaders(accessToken) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "opensource-radar",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(accessToken && { Authorization: `Bearer ${accessToken}` }),
  };
}

function toTokens(data) {
  const now = Date.now();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || null,
    accessExpiresAt: data.expires_in ? now + data.expires_in * 1000 : null,
    refreshExpiresAt: data.refresh_token_expires_in
      ? now + data.refresh_token_expires_in * 1000
      : null,
  };
}

async function requestToken(params) {
  try {
    const response = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(params),
    });
    const data = await response.json();

    // GitHub reports problems (bad code, expired refresh token) as 200 + error.
    return response.ok && data.access_token ? toTokens(data) : null;
  } catch {
    return null;
  }
}

export function exchangeCode(config, code, redirectUri) {
  return requestToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
  });
}

export function refreshTokens(config, refreshToken) {
  return requestToken({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
}

export async function fetchUser(accessToken) {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: githubHeaders(accessToken),
    });
    if (!response.ok) return null;

    const user = await response.json();
    return {
      login: user.login,
      name: user.name || user.login,
      avatarUrl: user.avatar_url,
    };
  } catch {
    return null;
  }
}

// Looks up several repositories in one GraphQL request. Returns one entry
// per name (null when the repository doesn't exist or can't be read).
export async function fetchRepositories(accessToken, names) {
  const variables = {};
  const params = [];
  const fields = names.map((name, index) => {
    const [owner, repo] = name.split("/");
    variables[`o${index}`] = owner;
    variables[`n${index}`] = repo;
    params.push(`$o${index}: String!, $n${index}: String!`);
    return `r${index}: repository(owner: $o${index}, name: $n${index}) {
      stargazerCount
      pushedAt
      isArchived
      contributingGuidelines { url }
    }`;
  });

  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { ...githubHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `query(${params.join(", ")}) { ${fields.join("\n")} }`,
      variables,
    }),
  });
  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed (${response.status})`);
  }

  // Missing repositories come back as null plus an entry in `errors`.
  const { data } = await response.json();
  return names.map((_, index) => data?.[`r${index}`] ?? null);
}

// Best effort: a failed revoke still signs the user out locally.
export async function revokeToken(config, accessToken) {
  try {
    const credentials = Buffer.from(
      `${config.clientId}:${config.clientSecret}`,
    ).toString("base64");

    await fetch(`https://api.github.com/applications/${config.clientId}/token`, {
      method: "DELETE",
      headers: {
        ...githubHeaders(),
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ access_token: accessToken }),
    });
  } catch {
    // Ignore; the session cookie is cleared regardless.
  }
}
