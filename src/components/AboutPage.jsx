import { useEffect, useRef, useState } from "react";
import { CONTRIBUTING_URL, REPO_URL, isPlainClick } from "../links";
import Icon from "./Icon";

const PROBLEMS = [
  {
    name: "Taken",
    problem: "Someone may already be working on it.",
    fix: "“Not taken yet” is on by default.",
  },
  {
    name: "Dead",
    problem: "Some projects haven’t been touched in months.",
    fix: "Filter to popular, active projects.",
  },
  {
    name: "Hidden",
    problem: "GitHub search needs syntax most beginners don’t know.",
    fix: "Suggestions appear as you type.",
  },
];

const STEPS = [
  {
    name: "Search",
    detail: "Type a language or pick a beginner starting point.",
  },
  {
    name: "Filter",
    detail: "Narrow it down to what suits you, such as popular, active projects.",
  },
  {
    name: "Check and save",
    detail: "See the project’s stars, activity and contributing guide, and bookmark what you like.",
  },
  {
    name: "Contribute",
    detail: "Choose “View issue”, ask to be assigned, make your fix and open a pull request.",
    onGitHub: true,
  },
];

const PRIVACY = [
  {
    name: "No GitHub permissions.",
    detail: "Signing in lets the site read public information only.",
  },
  {
    name: "Your sign-in stays protected.",
    detail: "The token is encrypted in a cookie the page can’t read.",
  },
  {
    name: "We store very little.",
    detail: "Just the issues you save, public project details, and short-lived counters that stop abuse. Problem reports become public issues on our GitHub repository.",
  },
];

const PEOPLE = [
  { name: "Deepti Nanda", initials: "DN", login: "Deepti-Nanda" },
  { name: "Aditya Raj", initials: "AR", login: "xreep" },
];

// Initials show until the GitHub photo has loaded, so a slow or blocked photo
// never leaves a broken-image icon.
function PersonPhoto({ login, initials }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <span className="aboutpage-photo">
      <span aria-hidden="true">{initials}</span>
      <img
        className={loaded ? "aboutpage-photo-loaded" : undefined}
        src={`https://github.com/${login}.png?size=104`}
        alt=""
        width="52"
        height="52"
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}

function AboutPage({ onBack }) {
  const headingRef = useRef(null);

  // Screen readers and keyboards start at the new page, not the old link.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <article className="aboutpage">
      <a
        className="aboutpage-back"
        href="/"
        onClick={(event) => {
          if (!isPlainClick(event)) return;
          event.preventDefault();
          onBack();
        }}
      >
        <Icon name="arrowLeft" />
        Back to search
      </a>

      <header className="aboutpage-intro">
        <p className="eyebrow">ABOUT US</p>
        <h1 ref={headingRef} tabIndex={-1}>
          Your first open-source contribution starts here.
        </h1>
        <p className="aboutpage-lead">
          OpenSource Radar helps beginners find an issue worth working on. It
          searches open issues across all of GitHub, then gets you to the project
          that needs your help.
        </p>
      </header>

      <section className="aboutpage-section">
        <h2>Why we built it</h2>
        <p className="aboutpage-sub">
          GitHub has hundreds of thousands of beginner issues. Finding the right
          one is the hard part.
        </p>
        <div className="aboutpage-problems">
          {PROBLEMS.map(({ name, problem, fix }) => (
            <div key={name} className="aboutpage-problem">
              <h3>{name}</h3>
              <p>{problem}</p>
              <p className="aboutpage-fix">{fix}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="aboutpage-section">
        <h2>How to use it</h2>
        <p className="aboutpage-sub">
          OpenSource Radar shows you the way. The contribution itself happens on
          GitHub.
        </p>
        <ol className="aboutpage-steps">
          {STEPS.map(({ name, detail, onGitHub }, index) => (
            <li key={name}>
              <span className="aboutpage-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
              {onGitHub ? (
                <span className="aboutpage-where aboutpage-where-github">
                  <Icon name="markGithub" />
                  On GitHub
                </span>
              ) : (
                <span className="aboutpage-where">OpenSource Radar</span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="aboutpage-section">
        <h2>Your privacy</h2>
        <p className="aboutpage-sub">You can search without an account.</p>
        <ul className="aboutpage-privacy">
          {PRIVACY.map(({ name, detail }) => (
            <li key={name}>
              <Icon name="check" />
              <span>
                <strong>{name}</strong> {detail}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="aboutpage-section">
        <h2>Who built it</h2>
        <p className="aboutpage-sub">Built in the open, one pull request at a time.</p>
        <div className="aboutpage-people">
          {PEOPLE.map(({ name, initials, login }) => (
            <a
              key={login}
              className="aboutpage-person"
              href={`https://github.com/${login}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <PersonPhoto login={login} initials={initials} />
              <span>
                <strong>{name}</strong>
                <span className="aboutpage-login">
                  @{login}
                  <span className="sr-only"> on GitHub (opens in a new tab)</span>
                </span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="aboutpage-cta">
        <div>
          <h2>OpenSource Radar is open source too</h2>
          <p>MIT licensed. Your first contribution could be to us.</p>
        </div>
        <div className="aboutpage-cta-actions">
          <a
            className="secondary-button"
            href={CONTRIBUTING_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            Contributing guide
          </a>
          <a
            className="primary-button"
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View on GitHub
          </a>
        </div>
      </section>
    </article>
  );
}

export default AboutPage;
