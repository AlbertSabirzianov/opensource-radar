import { FAQ, GUIDE_PATH, LANGUAGE_PAGES } from "../seoPages";

// Language links shown here and on the guide. They're ordinary links, so they
// load the page's own HTML, the back button works, and search engines follow them.
export function LanguageLinks({ current = null }) {
  return (
    <section className="search-help-section">
      <h2>Browse good first issues by language</h2>
      <ul className="search-help-links">
        {LANGUAGE_PAGES.filter((page) => page !== current).map((page) => (
          <li key={page.slug}>
            <a href={page.path}>{page.language}</a>
          </li>
        ))}
      </ul>
    </section>
  );
}

// The fixed text below the search results.
function SearchHelp({ languagePage }) {
  return (
    <section className="search-help">
      {languagePage && (
        <section className="search-help-section">
          <h2>Getting started with {languagePage.language}</h2>
          <p>{languagePage.summary}</p>
          <p>
            Commands many {languagePage.language} projects use. Check each project’s
            contributing guide first, because it may do things differently.
          </p>
          <ul className="search-help-commands">
            {languagePage.commands.map(([label, command]) => (
              <li key={command}>
                <span>{label}</span> <code>{command}</code>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="search-help-section">
        <h2>Questions beginners ask</h2>
        <div className="search-help-grid">
          {FAQ.map(({ question, answer }) => (
            <div key={question} className="search-help-item">
              <h3>{question}</h3>
              <p>{answer}</p>
            </div>
          ))}
        </div>
        <p className="search-help-more">
          New to this? Read{" "}
          <a href={GUIDE_PATH}>how to make your first open-source contribution</a>.
        </p>
      </section>
      <LanguageLinks current={languagePage} />
    </section>
  );
}

export default SearchHelp;
