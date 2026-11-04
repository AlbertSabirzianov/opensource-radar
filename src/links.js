export const REPO_URL = "https://github.com/opensource-radar/opensource-radar";
export const CONTRIBUTORS_URL = `${REPO_URL}/graphs/contributors`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
export const REPORT_PROBLEM_URL = `${REPO_URL}/issues/new`;
export const CONTRIBUTION_GUIDE_URL =
  "https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project";

export const ABOUT_PATH = "/about";

// Ctrl/Cmd/Shift-click or a middle click still opens a link the normal way.
export const isPlainClick = (event) =>
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;
