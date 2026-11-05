# 🔎 OpenSource Radar

**Find your first open-source contribution.**

OpenSource Radar helps developers find open issues they can contribute to, across all public projects on GitHub. It starts with beginner-friendly issues that nobody has taken yet, and lets you narrow things down by language, project, activity and more.

🌐 **Live site:** [opensource-radar.com](https://opensource-radar.com/)

## ✨ Features

- 🔍 **Search all of GitHub** — live search over open issues in every public repository
- 🌱 **Beginner friendly by default** — starts with `good first issue` issues that nobody has taken yet
- 💡 **Suggestions while you type** — matching languages and projects, plus quick starting points: good first issues nobody has taken, updated today, docs and small fixes, and projects that welcome beginners
- 🕘 **Recent searches** — your last few searches appear in the search box, kept only in your browser
- 🎛️ **Filters** — type of issue, not taken yet, no pull request yet, comments, last updated, programming language, regional language, project or organisation, popular and active projects only, and sort order
- 🌏 **Regional language filter** — finds issues that mention one of GitHub's 184 spoken languages, in English or its own script, such as translation work. GitHub can't filter by the language an issue is written in, so these are matches on the words
- ⭐ **Project details on cards** — stars, a warning for archived or quiet projects, and a link to the contributing guide
- 🔗 **Shareable searches** — the search lives in the address bar, so a link opens exactly the same results
- 🔐 **Sign in with GitHub** — higher search limits, plus:
  - 🔖 **Saved issues**, synced across your devices
  - ✨ **Recommended for you**, based on the languages in your own repositories
  - 🔀 **My contributions**, your pull requests at a glance
- 🐞 **Report a problem** — a form inside the site that turns reports into GitHub issues
- ⏳ **Waits out GitHub's search limit** — if the limit is reached, the page counts down and loads your results by itself
- ℹ️ **About page** — why the project exists, how to use it and what it stores, at [`/about`](https://opensource-radar.com/about)
- 🌓 **Light, dark and system themes** using GitHub's own colours, and a layout that works on phones

## 🛠️ Tech stack

| Technology | Purpose |
| --- | --- |
| React + Vite | User interface and build tooling |
| GitHub REST & Search APIs | Issues, projects and user data |
| Vercel Functions (`api/`) | Sign-in, the GitHub proxy, saved issues and reports |
| GitHub OAuth | "Sign in with GitHub" |
| Upstash Redis | Saved issues across devices, report spam limits |
| Vitest + GitHub Actions | Automated tests and checks on every pull request |
| Vercel | Hosting and deployment |

## 🚀 Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) 20.19 or newer (22 recommended), with npm
- [Git](https://git-scm.com/)

### Run it locally

```bash
git clone https://github.com/opensource-radar/opensource-radar.git
cd opensource-radar
npm install
npm run dev
```

Open the address printed in the terminal, usually `http://localhost:5173/`.

That's all you need for searching. Sign-in, saved-issue sync and the report form are **optional** and stay hidden until they're set up.

### Optional: GitHub sign-in

1. Create a GitHub OAuth app (GitHub → Settings → Developer settings → OAuth Apps → New OAuth App):
   - **Homepage URL:** `http://localhost:5173`
   - **Callback / redirect URL:** `http://localhost:5173/auth/callback`
2. Copy the settings template and fill it in:
   ```bash
   cp .env.example .env.local
   ```
3. Create a random session key for `SESSION_SECRET`:
   ```bash
   openssl rand -hex 32
   ```
4. Restart `npm run dev`. "Sign in with GitHub" now appears in the ☰ menu.

`.env.local` is git-ignored. Never commit it or share its values.

### Optional: saved-issue sync and the report form

- **Sync across devices** needs an [Upstash Redis](https://upstash.com/) database. Add its REST URL and token as `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
- **The report form** needs a fine-grained GitHub token limited to your repository, with only **Issues: Read and write**. Add it as `REPORT_GITHUB_TOKEN`.
- **Project details on cards** (stars, activity, contributing guide) work for signed-in users automatically. To show them to visitors too, add a fine-grained token with **Public repositories (read-only)** access and no permissions as `GITHUB_READ_TOKEN`.

### Settings

| Name | Needed for | Where it comes from |
| --- | --- | --- |
| `GITHUB_CLIENT_ID` | Sign-in | Your GitHub OAuth app |
| `GITHUB_CLIENT_SECRET` | Sign-in | Your GitHub OAuth app |
| `SESSION_SECRET` | Sign-in | Any random string of 32+ characters |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Saved-issue sync, report limits | Upstash Redis (Vercel adds these automatically) |
| `REPORT_GITHUB_TOKEN` | Report form | Fine-grained GitHub token (Issues only) |
| `REPORT_REPO` | Report form (optional) | Defaults to `opensource-radar/opensource-radar` |
| `GITHUB_READ_TOKEN` | Project details for visitors (optional) | Fine-grained GitHub token with public read-only access, no permissions |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Starts the site and the `api/` functions locally |
| `npm test` | Runs the automated tests |
| `npm run lint` | Checks the code for problems |
| `npm run build` | Builds the site into `dist/` |

## 📂 Project structure

```text
opensource-radar/
├── api/                    # Vercel Functions (run on the server)
│   ├── auth/               # Sign in, callback, sign out
│   ├── _lib/               # Shared helpers (not public routes)
│   ├── github.js           # Proxy that uses the signed-in user's token
│   ├── me.js               # Who is signed in, which features are on
│   ├── report.js           # Report form → GitHub issue
│   └── saved.js            # Saved issues per account
├── src/
│   ├── components/         # Search bar, filters, issue cards, menu, dialogs
│   ├── App.jsx             # Page layout and state
│   ├── search.js           # Filters ⇄ GitHub search query ⇄ address bar
│   ├── spokenLanguages.js  # GitHub's spoken language list, for the regional filter
│   ├── recent.js           # Recent searches, kept in the browser
│   ├── rateLimit.js        # Waiting out GitHub's limit, sharing repeat requests
│   ├── links.js            # Links used around the site
│   ├── seoPages.js         # Text of the language pages, guide and FAQ
│   ├── pageMeta.js         # Page title and description for search engines
│   ├── preview.js          # Safe plain-text issue previews
│   └── github.js           # Chooses direct GitHub or the proxy
├── scripts/                # Builds each page's HTML and the sitemap
├── tests/                  # Automated tests
├── .github/                # Issue and pull request templates, CI
├── .env.example            # Settings template
└── vercel.json             # Maps /auth/* to the sign-in functions, and pages to their own HTML
```

## ⚙️ How it works

- **Search** uses GitHub's issue search. Your filters become a GitHub query (for example `label:"good first issue" no:assignee language:python`), which is also kept in the address bar.
- **Visitors** call GitHub directly, which allows 10 searches a minute. **Signed-in users** go through `api/github.js`, which adds their own token (30 searches a minute). The proxy only allows the few read-only endpoints the site needs.
- **Results are cached** for a few minutes, so going back to a page doesn't spend another search. A repeat of a search that's still on its way shares its answer, and a search you moved on from is still kept.
- **At GitHub's limit,** the page waits for the limit to reset and searches again by itself, with a few seconds' random spread so people on the same network don't all retry together. It gives up after 5 tries in a row, and only retries real limit responses.
- **Sign-in** uses GitHub OAuth with a `state` check. The token is stored encrypted in an `HttpOnly` cookie and never reaches the browser's JavaScript.

## 🗺️ Roadmap

- [x] Search open issues across all of GitHub
- [x] Beginner-friendly suggestions and filters
- [x] Sign in with GitHub, saved issues synced across devices
- [x] Recommendations and contributions for signed-in users
- [x] In-site report form
- [x] Logo and sharing preview image
- [x] Project details on issue cards and a popular-projects filter
- [x] Recent searches, regional language filter and About page
- [ ] Saved searches

## 🤝 Contributing

Contributions are welcome — especially from first-time contributors. See [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 📄 License

[MIT](LICENSE)

## 👩‍💻 Author

**Deepti Nanda**

- GitHub: [@Deepti-Nanda](https://github.com/Deepti-Nanda)
- Project repository: [opensource-radar/opensource-radar](https://github.com/opensource-radar/opensource-radar)
- Live site: [OpenSource Radar](https://opensource-radar.com/)

---

⭐ If you find this project useful, consider starring the repository and following its development.

*Built step by step while learning React, frontend development, and open-source project workflows.*
