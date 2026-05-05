# Contributing to vibe-term

Thanks for your interest in improving vibe-term! This is a small project; the dev loop is intentionally lightweight.

## Prerequisites

- Node.js 20+
- tmux (for end-to-end smoke testing)
- A working Claude Code CLI install

## Dev loop

```bash
git clone https://github.com/ssugar/vibe-term.git
cd vibe-term
npm install --legacy-peer-deps
npm run dev          # run the TUI from source via tsx
npm test             # run vitest once
npm run test:watch   # run vitest in watch mode
```

## Quality gates

Before opening a PR, please make sure all of these pass locally — CI runs the same checks on Node 20/22 across Linux and macOS:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run build
```

To auto-fix style issues:

```bash
npm run lint:fix
npm run format
```

## Tests

- Tests live next to the code they cover, named `*.test.ts`.
- Pure logic (formatters, parsers, classifiers) should be covered by unit tests.
- Avoid mocking tmux/process side effects in this phase — orchestration code is best exercised manually until a more substantial test seam is introduced.
- JSONL fixtures for transcript parsing live under `src/services/__fixtures__/`.

## Commit messages

This project uses [Conventional Commits](https://www.conventionalcommits.org/) (the `release` script depends on it):

- `feat: ...` — new user-visible feature
- `fix: ...` — bug fix
- `chore: ...` — tooling, infra, non-user-visible
- `test: ...` — test additions / updates
- `docs: ...` — documentation only
- `refactor: ...` — code change that neither fixes a bug nor adds a feature

Keep PRs focused; a small clean PR is much easier to review than a large mixed one.

## Releasing

Maintainers cut releases via:

```bash
npm run release:patch   # or :minor / :major
git push --follow-tags
```

This bumps the version, updates `CHANGELOG.md`, and tags the commit.
