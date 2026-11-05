import { CONTRIBUTION_GUIDE_URL, isPlainClick } from "../links";
import { GUIDE } from "../seoPages";
import Icon from "./Icon";
import { LanguageLinks } from "./SearchHelp";

function GuidePage({ onBack }) {
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
        <p className="eyebrow">BEGINNER’S GUIDE</p>
        <h1>{GUIDE.heading}</h1>
        <p className="aboutpage-lead">{GUIDE.lead}</p>
      </header>

      <section className="aboutpage-section">
        <h2>The seven steps</h2>
        <ol className="aboutpage-steps">
          {GUIDE.steps.map(({ name, detail }, index) => (
            <li key={name} className="guide-step">
              <span className="aboutpage-step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <strong>{name}</strong>
                <span>{detail}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="aboutpage-section">
        <h2>If you get stuck</h2>
        <div className="search-help-grid">
          {GUIDE.tips.map(({ question, answer }) => (
            <div key={question} className="search-help-item">
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>
        <p className="search-help-more">
          Want more detail? See{" "}
          <a href={CONTRIBUTION_GUIDE_URL} target="_blank" rel="noopener noreferrer">
            GitHub’s own guide to contributing
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </section>

      <LanguageLinks />
    </article>
  );
}

export default GuidePage;
