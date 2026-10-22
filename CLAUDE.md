# speckit-ui

Speckit Workspace: a web UI for running a project through the Spec Kit flow. See README.md for
what it does and how each mode works.

## Rules

The development rules live in `.specify/memory/constitution.md` (v1.4.2). Read it before changing
code. In short:

- Git is the source of truth. The app writes only to tracking issues labelled `speckit` and to the
  viewed spec's `specs/*/highlights.json` (one `[skip ci]` commit per save, confirmed once per repo).
- Keys belong to the user (non-negotiable): never in the repo, build, logs or URLs. The static
  build's CSP limits network calls to `api.github.com` and `api.anthropic.com`. On the server,
  tokens stay server-side (env or in-memory sign-in session); the browser only gets an HttpOnly cookie.
- Every mode uses the current user's own GitHub access: Pages token, server sign-in (GitHub App),
  or a local token in `.env.local` (git-ignored; token mode listens on 127.0.0.1 only).
- Three modes (demo, server, static) share one behaviour. Say which modes a change touches.
- Demo mode stays pixel-identical to the design, except parts a spec marks as belonging to another
  unfinished spec (list them in the PR). Use Modernist tokens and classes only; the colour
  exceptions are the reader page-theme table (specs/010) and the `--hl-*` highlight tokens in
  `src/styles/reader.css`, both applied through tokens.
- Tests use synthetic fixtures and mocked GitHub/Anthropic. This repo is public: never copy
  content from users' private repos into it.

## Commands

```bash
npm run dev          # app + API at http://localhost:5173 (reads .env, then .env.local)
npm test             # Vitest
npm run typecheck
npm run build        # server build
npm run build:pages  # static build for GitHub Pages
```

All four must pass before merging. Merging to `main` deploys to GitHub Pages.

## Spec Kit

Spec Kit 0.15.1 with the Claude integration (`/speckit-*` skills in `.claude/skills/`).

- Full flow (specify → clarify → plan → tasks → analyze → implement): changes to keys, token
  permissions or network destinations; a new kind of write; changes affecting 2+ modes; a new
  file format to parse; or more than 2 days of work.
- Specify + plan: medium features in one mode.
- Direct PR: bug fixes, UI and copy tweaks.

Specs go in `specs/NNN-name/`. Save `/speckit-analyze` output as `specs/NNN-…/analysis.md`. Create
branches yourself (`feat/…`, `fix/…`, `chore/…`) and mention `specs/NNN-…` in the PR description.
