import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import {
  ABOUT_PATH,
  CONTRIBUTION_GUIDE_URL,
  REPORT_PROBLEM_URL,
  isPlainClick,
} from "../links";
import ContributionsDialog from "./ContributionsDialog";
import ReportDialog from "./ReportDialog";
import Icon from "./Icon";

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
  { value: "system", label: "Sync with system", icon: "deviceDesktop" },
];

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

function NavMenu({
  themePreference,
  onThemeChange,
  user,
  signInAvailable,
  onSignOut,
  savedCount,
  onShowSaved,
  onShowRecommended,
  onShowAbout,
  reportsAvailable,
  theme,
  ref,
}) {
  const [open, setOpen] = useState(false);
  const [contributionsOpen, setContributionsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const wrapperRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const returnFocusRef = useRef(null);
  const menuId = useId();

  // Lets the footer open the report form; focus then returns to the footer link.
  useImperativeHandle(ref, () => ({
    showReport() {
      returnFocusRef.current = document.activeElement;
      setReportOpen(true);
    },
  }));

  const restoreDialogFocus = () => {
    (returnFocusRef.current ?? triggerRef.current)?.focus();
    returnFocusRef.current = null;
  };

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

  const openMenu = () => setOpen(true);

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
          <a
            role="menuitem"
            className="menu-item"
            href={ABOUT_PATH}
            onClick={(event) => {
              if (!isPlainClick(event)) return;
              event.preventDefault();
              closeMenu();
              onShowAbout();
            }}
          >
            <Icon name="info" />
            About OpenSource Radar
          </a>
          {reportsAvailable ? (
            <button
              type="button"
              role="menuitem"
              className="menu-item"
              onClick={() => {
                closeMenu();
                setReportOpen(true);
              }}
            >
              <Icon name="bug" />
              Report a problem
            </button>
          ) : (
            // Until the report form is set up on the server, fall back to
            // opening a GitHub issue directly.
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
          )}

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

      {reportOpen && (
        <ReportDialog
          user={user}
          theme={theme}
          onClose={() => {
            setReportOpen(false);
            restoreDialogFocus();
          }}
        />
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
    </div>
  );
}

export default NavMenu;
