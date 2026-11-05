// The text of every page search engines can list. The app shows it to visitors
// and scripts/prerender.js puts the same text in each page's HTML at build time.
// Keep this file free of imports: the build runs it outside the bundler.
export const SITE_URL = "https://opensource-radar.com";
export const CONTENT_UPDATED = "2026-11-05";
export const GUIDE_PATH = "/first-contribution";

export const HOME = {
  path: "/",
  title: "Good First Issues on GitHub for Beginners | OpenSource Radar",
  description:
    "Find good first issues across all of GitHub. Filter by language and project, skip issues already taken, and make your first open-source contribution.",
};

export const ABOUT = {
  path: "/about",
  title: "About OpenSource Radar – Find Your First Open-Source Issue",
  description:
    "Why OpenSource Radar exists, how to find a good first issue and make your first open-source contribution, and what the site stores about you.",
  heading: "Your first open-source contribution starts here.",
  lead: "OpenSource Radar helps beginners find an issue worth working on. It searches open issues across all of GitHub, then gets you to the project that needs your help.",
};

export const FAQ = [
  {
    question: "What is a good first issue?",
    answer:
      "It's a task that a project's maintainers have marked as suitable for someone new, usually with the “good first issue” label. These tasks are often small and well explained, so you can learn how the project works without needing to understand all of it.",
  },
  {
    question: "Do I need to be an expert to contribute?",
    answer:
      "No. Maintainers add this label because they want newcomers to take these tasks. Documentation fixes, small bugs and tests all count, and asking a clear question on the issue is a normal part of the process.",
  },
  {
    question: "How do I know nobody is working on an issue?",
    answer:
      "OpenSource Radar's “Not taken yet” filter shows issues with nobody assigned. Someone may still have offered in the comments, so read them, then ask to be assigned before you start.",
  },
  {
    question: "Is OpenSource Radar free?",
    answer:
      "Yes. It's free and open source under the MIT licence, and you can search without an account. Signing in with GitHub is optional and lets you save issues across your devices.",
  },
];

export const GUIDE = {
  path: GUIDE_PATH,
  title: "How to Make Your First Open-Source Contribution | OpenSource Radar",
  description:
    "A step-by-step beginner's guide to your first open-source contribution: find a good first issue, ask to be assigned, fork, fix, open a pull request and get it merged.",
  heading: "How to make your first open-source contribution",
  lead: "You don't need to be an expert, and you don't need to understand a whole project. Here's the path from finding an issue to getting your pull request merged, one step at a time.",
  steps: [
    {
      name: "Find an issue that suits you",
      detail:
        "Pick a language you already know, and look for issues nobody has taken. Popular, active projects are a good place to start, because someone is more likely to review your work.",
    },
    {
      name: "Read before you commit",
      detail:
        "Read the whole issue and its comments, then the project's contributing guide. It tells you how to set up the project, how to run its tests and what the maintainers expect.",
    },
    {
      name: "Ask to be assigned",
      detail:
        "Leave a short comment saying you'd like to work on it. Wait for a reply if the project asks you to, so that two people don't end up fixing the same thing.",
    },
    {
      name: "Fork, then make a branch",
      detail:
        "Fork the repository to your own account, clone your copy and create a branch for this one change. Keeping changes on a separate branch makes them easier to review and update.",
    },
    {
      name: "Make the smallest fix that works",
      detail:
        "Change only what the issue asks for, and follow the code style around it. Run the project's tests before you commit.",
    },
    {
      name: "Open a pull request",
      detail:
        "Push your branch and open a pull request. Explain what you changed and why, and link the issue by writing “Fixes #123” with its number, so that it closes automatically when your work is merged.",
    },
    {
      name: "Respond to review, then get merged",
      detail:
        "Reviewers may ask for changes. That's normal, and it isn't a sign you did badly. Push the updates to the same branch, and once it's approved a maintainer will merge it.",
    },
  ],
  tips: [
    {
      question: "What if nobody replies?",
      answer:
        "Maintainers are often volunteers, so give it a few days, then leave one polite follow-up. If there's still no answer, it's fine to pick an issue in a more active project.",
    },
    {
      question: "What if someone else opened a pull request first?",
      answer:
        "It happens, and your time isn't wasted. You've learned how the project works, so pick another issue there. It will go faster the second time.",
    },
    {
      question: "How big should my first contribution be?",
      answer:
        "As small as you can find. A one-line documentation fix teaches you the whole process, from fork to merge, and that's the part you can reuse on everything after it.",
    },
  ],
};

const language = (name, slug, summary, commands) => ({
  language: name,
  slug,
  path: `/good-first-issues/${slug}`,
  title: `Good First Issues in ${name} for Beginners | OpenSource Radar`,
  description: `Find open ${name} good first issues nobody has taken yet, from projects across GitHub. Filter to popular, active projects and make your first ${name} contribution.`,
  heading: `Good first issues in ${name}`,
  intro: `Open ${name} issues for beginners that nobody has taken yet.`,
  summary,
  commands,
});

export const LANGUAGE_PAGES = [
  language(
    "JavaScript",
    "javascript",
    "JavaScript projects cover websites, servers and developer tools. Many beginner issues are small interface fixes, tests or documentation, so you can often see the result of your change straight away.",
    [
      ["Install what the project needs", "npm install"],
      ["Run its tests", "npm test"],
      ["Check its code style, if it has a lint script", "npm run lint"],
    ],
  ),
  language(
    "TypeScript",
    "typescript",
    "TypeScript is JavaScript with types, and it's common in web apps and developer tools. The compiler points out mistakes as you work, which helps when you're finding your way around someone else's code.",
    [
      ["Install what the project needs", "npm install"],
      ["Check the types", "npx tsc --noEmit"],
      ["Run its tests", "npm test"],
    ],
  ),
  language(
    "Python",
    "python",
    "Python projects range from data science and machine learning to web back ends and automation. Clear, readable code makes it a popular language for a first contribution, and many issues are small bugs, tests or documentation.",
    [
      ["Create a separate environment", "python -m venv .venv"],
      ["Install the project, if it's packaged", "pip install -e ."],
      ["Run its tests, if it uses pytest", "pytest"],
    ],
  ),
  language(
    "Java",
    "java",
    "Java runs a lot of back-end systems, Android apps and developer tools. Projects are often large, so look for an issue that clearly names the files involved, and check which Java version the project needs first.",
    [
      ["Run the tests with Maven", "mvn test"],
      ["Or run them with Gradle", "./gradlew test"],
    ],
  ),
  language(
    "Go",
    "go",
    "Go is widely used for servers, cloud infrastructure and command-line tools. Its standard tools are the same in almost every project, so you can usually build, test and format code right away.",
    [
      ["Run all the tests", "go test ./..."],
      ["Format your code", "gofmt -w ."],
      ["Check for common mistakes", "go vet ./..."],
    ],
  ),
  language(
    "Rust",
    "rust",
    "Rust is used for fast, reliable tools and systems software. The compiler's error messages are detailed, so they guide you towards a fix, and many projects mark smaller tasks for newcomers.",
    [
      ["Run the tests", "cargo test"],
      ["Format your code", "cargo fmt"],
      ["Check for common mistakes", "cargo clippy"],
    ],
  ),
  language(
    "C++",
    "cpp",
    "C++ powers game engines, browsers and performance-critical software. Build setup is often the hardest first step, so follow the project's build instructions closely, and pick an issue with a small, clear scope.",
    [
      ["Configure a build, if it uses CMake", "cmake -B build"],
      ["Compile it", "cmake --build build"],
      ["Run the tests", "ctest --test-dir build"],
    ],
  ),
  language(
    "C#",
    "csharp",
    "C# is common in .NET applications, web back ends and games. The dotnet command handles building, testing and formatting, so you can usually get a project running with very little setup.",
    [
      ["Build the project", "dotnet build"],
      ["Run the tests", "dotnet test"],
      ["Format your code", "dotnet format"],
    ],
  ),
  language(
    "Ruby",
    "ruby",
    "Ruby is best known for web applications built with Rails, and it has a long tradition of welcoming newcomers. Many projects keep a set of small issues for people making their first contribution.",
    [
      ["Install what the project needs", "bundle install"],
      ["Run the tests, if it uses RSpec", "bundle exec rspec"],
      ["Check its code style, if it uses RuboCop", "bundle exec rubocop"],
    ],
  ),
  language(
    "PHP",
    "php",
    "PHP runs a large share of the web, including content management systems and frameworks. Many beginner issues are small bug fixes, translations or documentation changes that don't need deep knowledge of the whole project.",
    [
      ["Install what the project needs", "composer install"],
      ["Run the tests, if it uses PHPUnit", "vendor/bin/phpunit"],
    ],
  ),
  language(
    "Swift",
    "swift",
    "Swift is used for iOS and Mac apps, and increasingly for server-side code and tools. Apps usually open in Xcode, while Swift packages can be built and tested from the command line.",
    [
      ["Build a Swift package", "swift build"],
      ["Run its tests", "swift test"],
    ],
  ),
  language(
    "Kotlin",
    "kotlin",
    "Kotlin is the main language for modern Android apps, and it's also used on servers. Most projects build with Gradle, so check the README for the Java version it needs before you start.",
    [
      ["Run the tests", "./gradlew test"],
      ["Build the project", "./gradlew build"],
    ],
  ),
];

export const languagePageForPath = (pathname) => {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return LANGUAGE_PAGES.find((page) => page.path === path) ?? null;
};

export const languagePageFor = (name) =>
  LANGUAGE_PAGES.find((page) => page.language === name) ?? null;

export const ALL_PAGES = [HOME, ABOUT, GUIDE, ...LANGUAGE_PAGES];
