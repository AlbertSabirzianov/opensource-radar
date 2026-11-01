import { useEffect, useId, useRef, useState } from "react";
import { githubUrl } from "../github";
import ContributionsDialog from "./ContributionsDialog";
import Icon from "./Icon";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Sync with system", icon: "deviceDesktop" },
];

const CONTRIBUTION_GUIDE_URL =
  "https://docs.github.com/en/get-started/exploring-projects-on-github/contributing-to-a-project";
const REPORT_PROBLEM_URL =
  "https://github.com/opensource-radar/opensource-radar/issues/new";
const MENU_ITEM_SELECTOR = '[role^="menuitem"]:not(:disabled)';

// GitHub avatar URLs accept ?s= for the size; ask for 2x for sharp edges.
function avatarSrc(url, size) {
  try {
    const avatar = new URL(url);
    avatar.searchParams.set("s", String(size * 2));
    return avatar.toString();
  } catch {
    return url;
  }
}

function formatUpdated(timestamp, now) {
  if (!timestamp) return "Not loaded yet";

  const minutes = Math.floor((now - timestamp) / 60000);
  if (minutes < 1) return "Updated just now";
  if (minutes < 60) return `Updated ${minutes} min ago`;

  return `Updated ${Math.floor(minutes / 60)} h ago`;
}

function NavMenu({
  themePreference,
  onThemeChange,
  onRefresh,
  loading,
  lastUpdated,
  repositories,
  user,
  signInAvailable,
  onSignOut,
  savedCount,
  onShowSaved,
  onShowRecommended,
}) {
  const [open, setOpen] = useState(false);
  const [contributionsOpen, setContributionsOpen] = useState(false);
  const [now, setNow] = useState(0);
  const [rateLimit, setRateLimit] = useState(null);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const aboutRef = useRef(null);
  const menuId = useId();
  const statusId = useId();
  const aboutTitleId = useId();

  useEffect(() => {
    if (!open) return undefined;

    menuRef.current?.querySelector(MENU_ITEM_SELECTOR)?.focus();

    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const openMenu = () => {
    setNow(Date.now());
    setOpen(true);

    // GitHub doesn't count calls to /rate_limit against the limit. Signed-in
    // users see their own 5,000-an-hour allowance.
    fetch(githubUrl("/rate_limit", Boolean(user)))
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => setRateLimit(data?.resources?.core ?? null))
      .catch(() => setRateLimit(null));
  };

  const closeMenu = ({ restoreFocus = false } = {}) => {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  };

  const handleTriggerKeyDown = (event) => {
    if (event.key === "ArrowDown" && !open) {
      event.preventDefault();
      openMenu();
    }
  };

  const handleMenuKeyDown = (event) => {
    const items = [...menuRef.current.querySelectorAll(MENU_ITEM_SELECTOR)];
    const index = items.indexOf(document.activeElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next =
        index === -1
          ? step === 1
            ? 0
            : items.length - 1
          : (index + step + items.length) % items.length;
      items[next]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      items[event.key === "Home" ? 0 : items.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu({ restoreFocus: true });
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  };

  const rateLimitText = rateLimit
    ? `${rateLimit.remaining.toLocaleString()} of ${rateLimit.limit.toLocaleString()} requests left`
    : "";
  const statusText = [formatUpdated(lastUpdated, now), rateLimitText]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="nav-menu" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={user ? "nav-button nav-avatar-button" : "nav-button"}
        aria-label={user ? `Open menu for @${user.login}` : "Open menu"}
        title="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => (open ? closeMenu() : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        {user ? (
          <img src={avatarSrc(user.avatarUrl, 32)} alt="" width="32" height="32" />
        ) : (
          <Icon name="threeBars" />
        )}
      </button>

      {open && (
        <div
          ref={menuRef}
          id={menuId}
          className="menu-panel"
          role="menu"
          aria-label={user ? `Menu, signed in as @${user.login}` : "Main menu"}
          onKeyDown={handleMenuKeyDown}
        >
          {user && (
            <>
              <div className="menu-account" aria-hidden="true">
                <img
                  src={avatarSrc(user.avatarUrl, 32)}
                  alt=""
                  width="32"
                  height="32"
                />
                <div className="menu-account-names">
                  <strong>{user.name}</strong>
                  <span>@{user.login}</span>
                </div>
              </div>
              <div className="menu-divider" role="separator" />

              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onShowSaved();
                }}
              >
                <Icon name="bookmark" />
                Saved issues
                <span
                  className="menu-item-trailing menu-counter"
                  aria-label={`${savedCount} saved`}
                >
                  {savedCount}
                </span>
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  onShowRecommended();
                }}
              >
                <Icon name="sparkleFill" />
                Recommended for you
              </button>
              <button
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  closeMenu();
                  setContributionsOpen(true);
                }}
              >
                <Icon name="gitPullRequest" />
                My contributions
              </button>
              <div className="menu-divider" role="separator" />
            </>
          )}

          {!user && signInAvailable && (
            <>
              <a role="menuitem" className="menu-signin" href="/auth/login">
                <Icon name="markGithub" />
                Sign in with GitHub
              </a>
              <div className="menu-divider" role="separator" />
            </>
          )}

          <div role="group" aria-label="Theme">
            <span className="menu-heading" aria-hidden="true">
              Theme
            </span>
            {THEME_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                role="menuitemradio"
                aria-checked={themePreference === option.value}
                className="menu-item"
                onClick={() => {
                  onThemeChange(option.value);
                  closeMenu({ restoreFocus: true });
                }}
              >
                <Icon name={option.icon} />
                {option.label}
                {themePreference === option.value && (
                  <span className="menu-item-trailing menu-check">
                    <Icon name="check" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="menu-divider" role="separator" />

          <button
            type="button"
            role="menuitem"
            className="menu-item"
            aria-describedby={statusId}
            disabled={loading}
            onClick={() => {
              onRefresh();
              closeMenu({ restoreFocus: true });
            }}
          >
            <Icon name="sync" />
            {loading ? "Loading..." : "Refresh issues"}
          </button>
          <p id={statusId} className="menu-status">
            {statusText}
          </p>

          <div className="menu-divider" role="separator" />

          <a
            role="menuitem"
            className="menu-item"
            href={CONTRIBUTION_GUIDE_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => closeMenu()}
          >
            <Icon name="book" />
            First contribution guide
            <span className="menu-item-trailing">
              <Icon name="linkExternal" />
            </span>
          </a>
          <button
            type="button"
            role="menuitem"
            className="menu-item"
            onClick={() => {
              closeMenu();
              aboutRef.current?.showModal();
            }}
          >
            <Icon name="info" />
            About OpenSource Radar
          </button>
          <a
            role="menuitem"
            className="menu-item"
            href={REPORT_PROBLEM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => closeMenu()}
          >
            <Icon name="bug" />
            Report a problem
            <span className="menu-item-trailing">
              <Icon name="linkExternal" />
            </span>
          </a>

          {user && (
            <>
              <div className="menu-divider" role="separator" />
              <button
                type="button"
                role="menuitem"
                className="menu-item menu-item-danger"
                onClick={() => {
                  closeMenu({ restoreFocus: true });
                  onSignOut();
                }}
              >
                <Icon name="signOut" />
                Sign out
              </button>
            </>
          )}
        </div>
      )}

      {contributionsOpen && user && (
        <ContributionsDialog
          login={user.login}
          onClose={() => {
            setContributionsOpen(false);
            triggerRef.current?.focus();
          }}
        />
      )}

      <dialog
        ref={aboutRef}
        className="about-dialog"
        aria-labelledby={aboutTitleId}
        onClick={(event) => {
          // A click on the dialog element itself is a click on the backdrop.
          if (event.target === aboutRef.current) {
            aboutRef.current.close();
          }
        }}
        onClose={() => triggerRef.current?.focus()}
      >
        <div className="about-header">
          <h2 id={aboutTitleId}>About OpenSource Radar</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close"
            onClick={() => aboutRef.current?.close()}
          >
            <Icon name="x" />
          </button>
        </div>
        <div className="about-body">
          <p>
            OpenSource Radar helps you find open issues to contribute to,
            including ones labeled &ldquo;good first issue&rdquo; and
            &ldquo;help wanted&rdquo;.
          </p>
          <p>Issues come straight from GitHub for these repositories:</p>
          <ul>
            {repositories.map((repo) => (
              <li key={repo}>{repo}</li>
            ))}
          </ul>
          <p>
            Results are saved in your browser for 10 minutes, so the site
            stays fast and stays within GitHub&rsquo;s request limit.
          </p>
        </div>
      </dialog>
    </div>
  );
}

export default NavMenu;
