import { LANGUAGES, isValidProject } from "./search";

// Recent searches stay in this browser only: no account, no server, and
// showing them never uses up GitHub's search limit.
const STORAGE_KEY = "opensource-radar-recent-searches";
export const MAX_RECENT = 5;
const MAX_TEXT_LENGTH = 200;

const sameSearch = (a, b) =>
  a.type === b.type && a.value.toLowerCase() === b.value.toLowerCase();

// Returns a safe entry, or null for anything we wouldn't have stored ourselves.
function cleanEntry(entry) {
  if (typeof entry?.value !== "string") return null;
  const value = entry.value.trim().slice(0, MAX_TEXT_LENGTH);
  if (!value) return null;

  if (entry.type === "text") return { type: "text", value };
  if (entry.type === "language" && LANGUAGES.includes(value)) {
    return { type: "language", value };
  }
  if (entry.type === "project" && isValidProject(value)) {
    return { type: "project", value };
  }
  return null;
}

export function cleanRecent(list) {
  if (!Array.isArray(list)) return [];
  return list.reduce((kept, item) => {
    const entry = cleanEntry(item);
    if (entry && kept.length < MAX_RECENT && !kept.some((k) => sameSearch(k, entry))) {
      kept.push(entry);
    }
    return kept;
  }, []);
}

// Newest first; searching for something again moves it back to the top.
export function addRecent(list, entry) {
  const clean = cleanEntry(entry);
  if (!clean) return list;
  return [clean, ...list.filter((item) => !sameSearch(item, clean))].slice(0, MAX_RECENT);
}

export const removeRecent = (list, entry) =>
  list.filter((item) => !sameSearch(item, entry));

export function recentLabel({ type, value }) {
  if (type === "language") return `${value} issues`;
  if (type === "project") return value.includes("/") ? value : `Projects by ${value}`;
  return value;
}

// All of them while the box is empty; only the matching ones while typing.
export function visibleRecent(list, typed) {
  const lower = typed.trim().toLowerCase();
  if (!lower) return list;
  return list.filter(
    (item) =>
      recentLabel(item).toLowerCase().includes(lower) &&
      !(item.type === "text" && item.value.toLowerCase() === lower),
  );
}

export function readRecentSearches() {
  try {
    return cleanRecent(JSON.parse(localStorage.getItem(STORAGE_KEY)));
  } catch {
    return [];
  }
}

function writeRecentSearches(list) {
  try {
    if (list.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable: the list just lasts until the page is closed.
  }
  return list;
}

export const rememberSearch = (entry) =>
  writeRecentSearches(addRecent(readRecentSearches(), entry));

export const forgetSearch = (entry) =>
  writeRecentSearches(removeRecent(readRecentSearches(), entry));

export const clearRecentSearches = () => writeRecentSearches([]);
