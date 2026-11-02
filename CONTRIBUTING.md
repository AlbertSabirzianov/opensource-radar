# Contributing to OpenSource Radar

Thanks for wanting to help! OpenSource Radar exists to make first contributions easier, so first-time contributors are especially welcome here.

## Ways to help

- **Report a problem** — use "Report a problem" in the site's menu, or [open an issue](https://github.com/opensource-radar/opensource-radar/issues/new/choose).
- **Suggest an idea** — open a feature request issue and describe what you'd like and why.
- **Fix something** — look for issues labelled [`good first issue`](https://github.com/opensource-radar/opensource-radar/labels/good%20first%20issue) or [`help wanted`](https://github.com/opensource-radar/opensource-radar/labels/help%20wanted).
- **Improve the docs** — typos, unclear steps and missing explanations all count.

Before starting on something big, open an issue or comment on an existing one so we can agree on the approach first.

## Setting up

Follow [Getting started](README.md#-getting-started) in the README. The basic site runs with just `npm install` and `npm run dev`; sign-in, saved-issue sync and the report form are optional and only need setting up if you're working on them.

## Making a change

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b fix/short-description
   ```
2. **Make your change.** Keep pull requests small and focused on one thing.
3. **Check it works:**
   ```bash
   npm run lint
   npm test
   npm run build
   ```
   For changes you can see, also check the site in light and dark mode and on a narrow (phone-sized) window.
4. **Commit** with a short message that starts with the kind of change, for example:
   - `fix: keep filters when going back a page`
   - `feat: add a "No comments" quick filter`
   - `docs: explain how to set up sign-in`
5. **Open a pull request** against `main` and fill in the template. Automatic checks (lint, tests and build) run on every pull request.

A maintainer will review it. We merge with "Create a merge commit", so your commits keep your name.

## Guidelines

- **Accessibility matters.** Everything should work with a keyboard and a screen reader. Use real buttons and links, labels on form fields, and visible focus outlines.
- **Plain words in the interface.** The site is for beginners — "Not taken yet" rather than "unassigned".
- **Keep secrets out of the code.** Settings like client secrets and tokens go in `.env.local` (never committed) or in Vercel's environment variables.
- **Mind GitHub's limits.** Visitors get 10 searches a minute, so avoid extra GitHub requests and reuse cached results where possible.

## Security problems

Please **don't** open a public issue for security problems. Instead, use **Report a vulnerability** in the repository's [Security tab](https://github.com/opensource-radar/opensource-radar/security), so it can be fixed before it's public.

## Be kind

Be respectful and patient with each other. Everyone was a beginner once.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
