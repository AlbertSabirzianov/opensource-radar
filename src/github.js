// Signed-in users go through our server (api/github.js), which adds their
// GitHub token: 5,000 requests an hour each. Everyone else calls GitHub
// directly, sharing the 60 an hour allowed per network.
export function githubUrl(path, signedIn) {
  return signedIn
    ? `/api/github?path=${encodeURIComponent(path)}`
    : `https://api.github.com${path}`;
}
