import { useEffect, useState } from "react";

const secondsLeft = (retryAt) => Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));

// Shown while the page waits to search again by itself. The countdown is hidden
// from screen readers, which would otherwise announce every second.
function SearchLimitNotice({ retryAt, signedIn, signInAvailable }) {
  const [seconds, setSeconds] = useState(() => secondsLeft(retryAt));

  useEffect(() => {
    const timer = setInterval(() => setSeconds(secondsLeft(retryAt)), 1000);
    return () => clearInterval(timer);
  }, [retryAt]);

  return (
    <div className="empty-state search-limit-notice">
      <p>
        <strong>GitHub needs a short break.</strong>{" "}
        {signedIn
          ? "It allows 30 searches a minute."
          : "It allows 10 searches a minute per network."}{" "}
        Your results will load by themselves
        <span aria-hidden="true"> in {seconds} s</span>.
      </p>
      {!signedIn && signInAvailable && (
        <p className="search-limit-tip">Signing in from the menu gives you more searches.</p>
      )}
    </div>
  );
}

export default SearchLimitNotice;
