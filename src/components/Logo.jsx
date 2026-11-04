// The radar mark. Decorative: it always sits next to the project's name.
function Logo() {
  return (
    <svg className="site-logo" viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="16" cy="16" r="8.5" fill="none" stroke="currentColor" strokeWidth="2" opacity=".55" />
      <path d="M16 16 L16 1.5 A14.5 14.5 0 0 1 26.25 5.75 Z" fill="currentColor" opacity=".35" />
      <path d="M16 16 L26.25 5.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}

export default Logo;
