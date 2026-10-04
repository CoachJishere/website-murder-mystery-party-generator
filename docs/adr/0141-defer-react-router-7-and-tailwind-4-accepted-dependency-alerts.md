# ADR-0141: Defer React Router 7 and Tailwind 4; accept the remaining dependency alerts for now

**Status:** Accepted (revisit on the triggers below)
**Date:** 2026-10-04
**Related:** CHANGELOG 2026-10-04 "Chore: dependency audit"

## Context

On 2026-10-04 `npm audit fix` and a `sharp` bump (0.35.3 to 0.35.5) cleared everything that did not need a major version. The build, the roster tests and a Chromium smoke render passed. What is left (14 open Dependabot alerts before the fix; `npm audit` now reports 10) falls into three groups:

1. **React Router (`react-router`, `react-router-dom`, runtime).** We are on 6.30.6, the latest 6.x. The open advisories are only patched in 7.18+: an open redirect via backslash in `<Link>` / `useNavigate` (Dependabot #99, a bypass of CVE-2025-68470) and "arbitrary constructor injection via `deserializeErrors()` in SSR hydration" (#97).
2. **Tailwind 3 and its tooling (`tailwindcss`, `chokidar`, `braces`, `micromatch`, `fast-glob`, build-time).** Fixes need Tailwind 4.
3. **Build tooling with no fix (`vite-plugin-ssr`, `lovable-tagger`).** Not shipped to users.

## Decision

Do not migrate to React Router 7 or Tailwind 4 now. Accept the remaining alerts.

## Rationale

- **Exposure checked.** The app is a client-side SPA (GitHub Pages). Navigation only goes to internal paths built from our own ids (`/mystery/${id}`), never to a URL taken from user input, so the backslash open redirect has no entry point. There is no SSR and no `hydrateRoot`, so the `deserializeErrors()` advisory does not apply. Groups 2 and 3 run on the developer machine and in the build, not in the browser.
- **Cost and risk.** Router 7 and Tailwind 4 are major migrations (Tailwind 4 changes the config and some utilities across the whole UI; Router 7 changes imports and data APIs). They touch every page of a revenue site with no visual regression suite, for no reachable vulnerability.

## Revisit when any of these happens

- We add SSR, server hydration, or navigate to a URL derived from user input (query string, stored link, form field).
- An advisory is published that is reachable in a client-only SPA (for example an XSS in `<Link>` rendering) or that rates critical.
- We touch routing or styling broadly anyway (a redesign), so the migration cost is already being paid.
- Dependabot starts blocking merges, or `npm audit --omit=dev` shows a vulnerability in a package we import at runtime that is not router.

## How to back out of this decision

Router: `npm install react-router-dom@7`, replace `react-router-dom` imports where the v7 codemod says, run the Playwright smoke script for `/`, `/mystery/:id`, `/mystery/purchase/:id`. Tailwind: follow the official v3 to v4 upgrade tool on a branch and compare screenshots of the landing page, chat, purchase and package views before merging. The lockfile before this decision is in git history at the commit "chore(deps): npm audit fix (lockfile) and sharp 0.35.5".

## Key files

`package.json`, `package-lock.json`.
