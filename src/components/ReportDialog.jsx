import { useEffect, useId, useRef, useState } from "react";
import Icon from "./Icon";

const REPORT_TYPES = [
  { value: "bug", label: "Bug" },
  { value: "wrong_info", label: "Wrong or outdated information" },
  { value: "suggestion", label: "Suggestion" },
  { value: "other", label: "Other" },
];
const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

const ERRORS = {
  rate_limited:
    "You've sent several reports in the last hour. Please try again later.",
  invalid_message: `Describe the problem in ${MESSAGE_MIN} to ${MESSAGE_MAX} characters.`,
};

// Mounted only while open (NavMenu renders it on demand), so each opening
// starts with an empty form.
function ReportDialog({ user, theme, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  const hintId = useId();
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [includeUsername, setIncludeUsername] = useState(true);
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState({ state: "editing" });

  useEffect(() => {
    if (!dialogRef.current.open) {
      dialogRef.current.showModal();
    }
  }, []);

  const trimmedLength = message.trim().length;
  const tooShort = trimmedLength < MESSAGE_MIN;

  const submit = async (event) => {
    event.preventDefault();
    if (tooShort || status.state === "sending") return;

    setStatus({ state: "sending" });
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          message: message.trim(),
          includeUsername: Boolean(user) && includeUsername,
          page: window.location.pathname + window.location.search,
          theme,
          website,
        }),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setStatus({
          state: "error",
          message:
            ERRORS[data.error] ||
            "Your report couldn't be sent. Please try again in a moment.",
        });
        return;
      }
      setStatus({ state: "sent", number: data.number, url: data.url });
    } catch {
      setStatus({
        state: "error",
        message: "Your report couldn't be sent. Check your connection and try again.",
      });
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="about-dialog report-dialog"
      aria-labelledby={titleId}
      onClick={(event) => {
        // A click on the dialog element itself is a click on the backdrop.
        if (event.target === dialogRef.current) dialogRef.current.close();
      }}
      onClose={onClose}
    >
      <div className="about-header">
        <h2 id={titleId}>Report a problem</h2>
        <button
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={() => dialogRef.current?.close()}
        >
          <Icon name="x" />
        </button>
      </div>

      {status.state === "sent" ? (
        <div className="about-body report-sent" role="status">
          <p>
            <strong>Thanks, your report was sent.</strong>
          </p>
          <p>
            {status.url ? (
              <>
                It&rsquo;s now{" "}
                <a href={status.url} target="_blank" rel="noopener noreferrer">
                  issue #{status.number}
                </a>{" "}
                on GitHub, where you can follow what happens next.
              </>
            ) : (
              "We'll take a look soon."
            )}
          </p>
          <div className="report-actions">
            <button
              type="button"
              className="report-submit"
              onClick={() => dialogRef.current?.close()}
            >
              Done
            </button>
          </div>
        </div>
      ) : (
        <form className="about-body report-form" onSubmit={submit} noValidate>
          <fieldset className="report-types">
            <legend>What kind of problem?</legend>
            {REPORT_TYPES.map((option) => (
              <label key={option.value} className="report-type">
                <input
                  type="radio"
                  name="report-type"
                  value={option.value}
                  checked={type === option.value}
                  onChange={() => setType(option.value)}
                />
                {option.label}
              </label>
            ))}
          </fieldset>

          <label className="report-label" htmlFor={messageId}>
            What happened?
          </label>
          <textarea
            id={messageId}
            className="report-message"
            rows={5}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="For example: the Python filter shows Java issues."
            aria-describedby={hintId}
            required
          />
          <p id={hintId} className="report-hint">
            Reports become public issues on GitHub, so please don&rsquo;t
            include personal information. We add the page, theme and browser
            to help us reproduce it. {Math.max(0, MESSAGE_MAX - message.length)}{" "}
            characters left.
          </p>

          {/* Honeypot: hidden from people, filled in by simple bots. */}
          <div className="report-trap" aria-hidden="true">
            <label>
              Website
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </label>
          </div>

          {user && (
            <label className="report-username">
              <input
                type="checkbox"
                checked={includeUsername}
                onChange={(event) => setIncludeUsername(event.target.checked)}
              />
              Add my GitHub username (@{user.login}) so you can follow up
            </label>
          )}

          {status.state === "error" && (
            <p className="report-error" role="alert">
              {status.message}
            </p>
          )}

          <div className="report-actions">
            <button
              type="button"
              className="report-cancel"
              onClick={() => dialogRef.current?.close()}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="report-submit"
              disabled={tooShort || status.state === "sending"}
            >
              {status.state === "sending" ? "Sending..." : "Send report"}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}

export default ReportDialog;
