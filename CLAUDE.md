# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Angular (standalone components, no NgModules) + Angular Material app for tracking scores at a hunting/shooting competition ("Međudruštveno natjecanje"). All app-facing text, comments, and commit history are in Croatian — keep new UI copy consistent with that. Data (teams, disciplines, results) is persisted in Firebase Realtime Database, synced in real time across viewers. Firebase Authentication (email/password) gates who can edit data; there's also a public, read-only route for spectators.

## Commands

```bash
npm install          # install dependencies
npm start             # ng serve — dev server
npm run build         # ng build — production output to dist/app/browser
npm test              # ng test — karma.conf.js + *.spec.ts files exist (src/app/core, src/app/pages/login)
npm run test:e2e      # playwright test — Playwright E2E suite (see below)
npm run test:e2e:ui   # same, with Playwright's UI runner
npm run emulators     # firebase emulators:start --only auth,database — standalone, for manual poking
```

There is no lint script configured. `angular.json` defines only a default (non-production) `build` configuration — there is no `production` configuration block, so `ng build --configuration production` will fail; plain `ng build` is what CI/deploy should use. `angular.json` also defines an `e2e` build/serve configuration (see below) — this one exists, `ng build --configuration e2e` / `ng serve --configuration=e2e` both work.

### E2E tests (Playwright + Firebase Local Emulator Suite)

`npm run test:e2e` runs Playwright, which itself starts everything it needs via its `webServer` array in `playwright.config.ts`: `firebase emulators:start --only auth,database` (Auth on `9099`, Realtime Database on `9000`, using the project's real `database.rules.json`) and `ng serve --configuration=e2e --port=4300` (Angular built with `fileReplacements` swapping in `src/environments/environment.e2e.ts`, which sets `useEmulators: true`). `main.ts` calls `connectDatabaseEmulator`/`connectAuthEmulator` when that flag is set, so the app under test never reaches the real `hunting-games-fe57e` project — **E2E tests only ever touch `127.0.0.1:9000`/`9099`**, never the production database described elsewhere in this file. Both processes are torn down automatically when the run ends.

The Realtime Database emulator is a JVM process (the Auth emulator is pure Node and doesn't need this) — a JRE must be on `PATH` for `npm run emulators` / `npm run test:e2e` to work. This machine didn't have one; `brew install openjdk` fixed it, and the `emulators` script in `package.json` prepends `$(brew --prefix openjdk)/bin` to `PATH` itself so `npm start`/`ng serve` remain unaffected and no shell profile edit was needed. If Java is genuinely missing on a machine, the emulator start step fails fast with an explicit "Unable to locate a Java Runtime" error — not a silent hang.

- `e2e/support/emulator.ts` — REST helpers against the emulators (`resetEmulatorData`, `seedDisciplines`/`resetToBaseline` for the 6 disciplines from TC 0.4 in `docs/MANUALNO-TESTIRANJE.md`, `createTestAdminUser`, `patchDisciplineMaxPoints`). Writes use the emulator-only `access_token=owner` REST param, which bypasses `database.rules.json` the same way the Admin SDK would (doesn't exist against production). Collections are seeded as plain JSON arrays, matching how `competition.service.ts` actually writes them (`setCollection('disciplines', updatedDisciplines)` — a JS array, not an object keyed by `id`).
- `e2e/pages/*.page.ts` — Page Object Model, one per screen/dialog (`overview.page.ts` so far).
- `e2e/tests/*.spec.ts` — one file per phase/section of `docs/MANUALNO-TESTIRANJE.md`, TC codes in test names for traceability.
- Full roadmap, phase-by-phase status, and the prompt for the next session live in `automation_plan.md` (root) — read that before starting new E2E work.

`environment.prod.ts` is not swapped in during build (no `fileReplacements` in `angular.json`) — its only difference from `environment.ts` is `production: true/false`; the Firebase config values are otherwise identical, so this doesn't affect deploys.

## Architecture

Everything lives under `src/app/`, split into `core/` (services, gateways, DI tokens, models), `pages/` (routed screens and their dialogs), and `testing/` (fakes used by specs).

- **`main.ts`** — bootstraps `AppComponent`, wires up `provideRouter`, and initializes the Firebase JS SDK directly (`initializeApp`, `getDatabase`, `getAuth`), providing the results via the `FIREBASE_DATABASE` / `FIREBASE_AUTH` injection tokens (`core/firebase-database.token.ts`, `core/firebase-auth.token.ts`) using `environment.firebase` config from `src/environments/`. Not using `@angular/fire`.
- **`app.component.ts`** — root shell (header + `<router-outlet>`) and the route table (`routes`):
  - `''` → `OverviewComponent`, behind `authGuard` (editable view, requires login)
  - `'login'` → `LoginComponent`
  - `'pracenje'` → `OverviewComponent` with `data: { readOnly: true }` — public, unauthenticated live-results view (no `authGuard`)
  
  Add new routes here.
- **`core/models.ts`** — all shared domain types: `Team`, `Competitor`, `Discipline`, `Result`, `CompetitorRanking`, `TeamRanking`, `AppState`. Category is always `'M' | 'Ž'` (men/women), never open-ended.
- **`core/competition.service.ts`** — the single source of truth. Holds an `AppState` (`teams`, `disciplines`, `results`) in a `BehaviorSubject` (`state$` / `.value`), fed via `RealtimeDbGateway.observeRoot()`. All mutations (`addTeam`, `updateTeam`, `deleteTeam`, `addResult`, `updateResult`, `deleteResult`, `addDiscipline`, etc.) read the current in-memory state, compute the next array, and write the *entire* collection (`teams`, `disciplines`, or `results`) back to Firebase — there's no per-record write, so any mutation replaces the whole list at that path. IDs are assigned client-side as `max(existing ids) + 1` (not Firebase push keys). Related records are cleaned up together: `updateTeam` (diffs old vs new members), `deleteTeam`, `removeCompetitorFromTeam`, and `deleteDiscipline` all cascade-delete the affected `results` alongside their primary collection write. Those four cascade methods use `RealtimeDbGateway.setCollections()` (a single atomic multi-path `update()`) rather than two independent `setCollection()` `set()` calls, specifically so a dropped connection mid-write can't leave one collection updated and the other stale — that gap (fixed 2026-09-08) is exactly how a "ghost" competitor with orphaned `results` but no team membership was produced once already. Single-collection mutations (`addTeam`, `addResult`, `updateResult`, `addCompetitorToTeam`, `deleteResult`, `addDiscipline`, `updateDiscipline`) still use plain `setCollection()`.
- **Scoring formula** — `calculateTotalPoints()` in `competition.service.ts` sums, over every discipline configured for the competitor's/team's category (`getDisciplinesForCategory()`), `score × (100 / discipline.maxPoints)`, so each discipline contributes up to 100 points regardless of its raw scoring range — driven entirely by each discipline's `maxPoints` field, not hardcoded per discipline name. Men and women use different discipline sets via `Discipline.category`.
- **`core/results-verification.service.ts`** — `ResultsVerificationService.verify()` runs before every PDF export (wired into `overview.component.ts`'s `verifyThenExport()`). Deliberately does **not** call `calculateTotalPoints()` or the ranking methods to check their own output; instead it checks structural invariants the formula doesn't check itself — duplicate `id`s across competitors/teams/disciplines/results, a duplicate result for the same competitor+discipline pair, results referencing a competitor/discipline `id` that no longer exists, and that both rankings' `rank` values form a contiguous `1..N` sequence. Returns `{ ok, issues }`; `overview.component.ts` shows a success snackbar and exports immediately when `ok`, otherwise opens `VerificationIssuesDialog` (`pages/overview/dialogs/verification-issues/`) listing the issues with a "Preuzmi ipak" (download anyway) action — verification never fully blocks the export.
- **`core/realtime-db.gateway.ts`** — thin seam around the `firebase/database` free functions (`onValue`, `set`, `update`). Exists because the Firebase SDK ships ESM with read-only named exports that can't be spied on directly in tests; this is the substitutable boundary instead. `setCollection(path, value)` is a plain single-path `set()`; `setCollections(updates)` writes multiple top-level collections in one atomic multi-path `update(ref(db), updates)` call (all-or-nothing) — use this whenever a mutation must change more than one collection together. No business logic here — that's `competition.service.ts`.
- **`core/auth.gateway.ts`** / **`core/auth.service.ts`** / **`core/auth.guard.ts`** — auth stack, same gateway-seam pattern as the DB. `AuthGateway` wraps `firebase/auth` (`onAuthStateChanged`, `signInWithEmailAndPassword`, `signOut`). `AuthService` exposes `user$` as `User | null | undefined` (`undefined` = initial Firebase auth check not yet resolved, `null` = signed out) and `login()`/`logout()`. `authGuard` waits for the first *resolved* (`!== undefined`) auth state before redirecting to `/login`, so a page refresh doesn't briefly bounce a signed-in user.
- **`pages/overview/overview.component.ts`** — the main editable/read-only screen: renders individual and team rankings (via `CompetitionService.getCompetitorRankings()` / `getTeamRankings()`), category filter, and opens the dialogs below via `MatDialog`. Takes a `readOnly` `@Input()` (bound from route `data` on `/pracenje`) that hides all mutation UI in the template.
- **`pages/overview/dialogs/`** — Material dialogs for CRUD, each a standalone component paired with the service call it drives: `add-team/` / `edit-team/` (teams + up to 3 members each, per `addCompetitorToTeam`), `add-result/` / `edit-result/` (results per competitor/discipline), `verification-issues/` (read-only, lists `ResultsVerificationService` findings before a PDF export — see below).
- **`pages/login/login.component.ts`** — email/password login form, calls `AuthService.login()`.
- **`core/pdf-report.service.ts`** — generates PDF exports (individual ranking, team ranking, or a combined report) using `jsPDF` + `jspdf-autotable`. Themed blue for individual / green for team, gold-silver-bronze row highlighting for top 3. See `PDF_EXPORT_README.md` for the full feature description and filename conventions.
- **`testing/fake-realtime-db.gateway.ts`** / **`testing/fake-auth.gateway.ts`** — in-memory fakes substituted for the real gateways in specs.
- **`environments/`** — `environment.ts` (dev) and `environment.prod.ts` hold the Firebase project config (API key, database URL, etc.) consumed by `main.ts`.

## Firebase

- Project: `hunting-games-fe57e` (see `.firebaserc`), hosting site `hunting-games-fe57e.web.app`.
- Realtime Database rules (`database.rules.json`): `.read: true` (public — needed for `/pracenje`), `.write: "auth != null"` (any authenticated Firebase user may write; there's no per-user role/allowlist beyond that). Since mutations replace whole collections (see `competition.service.ts` above), any signed-in account has full destructive power over `teams`/`disciplines`/`results` — only give login credentials to trusted organizers.
- `firebase.json` hosting `public` is `dist/app/browser`, matching the Angular application builder's actual output path (`angular.json`'s `outputPath.base: dist/app` + its `browser/` subfolder) — `firebase deploy --only hosting` works as-is after `npm run build`.
- The service reads/writes at the database root level (`teams`, `disciplines`, `results` as top-level keys), not nested under `competition-data/` as `FIREBASE_SETUP.md`'s "Struktura podataka" section describes — that doc is stale relative to `competition.service.ts`.
