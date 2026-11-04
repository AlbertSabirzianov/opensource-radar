import {
  CONTRIBUTING_URL,
  CONTRIBUTION_GUIDE_URL,
  CONTRIBUTORS_URL,
  LICENSE_URL,
  REPORT_PROBLEM_URL,
  REPO_URL,
} from "../links";
import { BEGINNER_PRESETS } from "../search";
import Icon from "./Icon";
import Logo from "./Logo";

const FIRST_ISSUES_PRESET = BEGINNER_PRESETS.find((preset) => preset.id === "first-issues");
const DOCS_PRESET = BEGINNER_PRESETS.find((preset) => preset.id === "docs");

function ExternalLink({ href, children }) {
  return (
    <a className="footer-link" href={href} target="_blank" rel="noopener noreferrer">
      {children}
      <Icon name="linkExternal" />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

function FooterButton({ onClick, children }) {
  return (
    <button type="button" className="footer-link" onClick={onClick}>
      {children}
    </button>
  );
}

function RadarCorner() {
  return (
    <svg className="footer-radar" viewBox="0 0 300 300" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.2">
        <circle cx="150" cy="150" r="50" />
        <circle cx="150" cy="150" r="100" />
        <circle cx="150" cy="150" r="148" />
      </g>
      <path d="M150 150 L45 255 A148 148 0 0 1 8 190 Z" fill="currentColor" opacity=".3" />
      <path d="M150 150 L45 255" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="86" cy="185" r="3.5" fill="currentColor" />
      <circle cx="112" cy="232" r="3" fill="currentColor" />
    </svg>
  );
}

function Footer({
  signedIn,
  reportsAvailable,
  onPreset,
  onShowPopular,
  onShowSaved,
  onShowAbout,
  onShowReport,
}) {
  return (
    <footer className="site-footer">
      <RadarCorner />
      <div className="footer-top">
        <div className="footer-brand">
          <div className="footer-name">
            <Logo />
            OpenSource Radar
          </div>
          <p className="footer-tagline">
            Find your first open-source issue. Search beginner-friendly issues
            across all of GitHub.
          </p>
          <a className="footer-star" href={REPO_URL} target="_blank" rel="noopener noreferrer">
            <Icon name="star" />
            Star on GitHub
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        <nav className="footer-column" aria-label="Explore">
          <h2>Explore</h2>
          <ul>
            <li>
              <FooterButton onClick={() => onPreset(FIRST_ISSUES_PRESET)}>
                Good first issues
              </FooterButton>
            </li>
            <li>
              <FooterButton onClick={onShowPopular}>Popular projects</FooterButton>
            </li>
            <li>
              <FooterButton onClick={() => onPreset(DOCS_PRESET)}>
                Docs and small fixes
              </FooterButton>
            </li>
            {signedIn && (
              <li>
                <FooterButton onClick={onShowSaved}>Saved issues</FooterButton>
              </li>
            )}
          </ul>
        </nav>

        <nav className="footer-column" aria-label="Project">
          <h2>Project</h2>
          <ul>
            <li>
              <FooterButton onClick={onShowAbout}>About</FooterButton>
            </li>
            <li>
              <ExternalLink href={REPO_URL}>GitHub repository</ExternalLink>
            </li>
            <li>
              <ExternalLink href={CONTRIBUTORS_URL}>Contributors</ExternalLink>
            </li>
            <li>
              <ExternalLink href={LICENSE_URL}>MIT licence</ExternalLink>
            </li>
          </ul>
        </nav>

        <nav className="footer-column" aria-label="Help">
          <h2>Help</h2>
          <ul>
            <li>
              <ExternalLink href={CONTRIBUTION_GUIDE_URL}>
                First contribution guide
              </ExternalLink>
            </li>
            <li>
              <ExternalLink href={CONTRIBUTING_URL}>Contributing guide</ExternalLink>
            </li>
            <li>
              {reportsAvailable ? (
                <FooterButton onClick={onShowReport}>Report a problem</FooterButton>
              ) : (
                <ExternalLink href={REPORT_PROBLEM_URL}>Report a problem</ExternalLink>
              )}
            </li>
          </ul>
        </nav>
      </div>

      <div className="footer-bottom">
        <p>© 2026 OpenSource Radar · Free and open source</p>
        <div className="footer-bottom-right">
          <p>Issue data from GitHub · Not affiliated with GitHub</p>
          <a
            className="footer-github"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="OpenSource Radar on GitHub (opens in a new tab)"
            title="OpenSource Radar on GitHub"
          >
            <Icon name="markGithub" />
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
