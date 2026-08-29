# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Angular 18 + Angular Material app for tracking scores at a hunting/shooting competition ("Međudruštveno natjecanje"). All app-facing text, comments, and commit history are in Croatian — keep new UI copy consistent with that. Data (teams, disciplines, results) is persisted in Firebase Realtime Database, synced in real time across viewers.

## Commands

```bash
npm install          # install dependencies
npm start             # ng serve — dev server
npm run build         # ng build — production output to dist/app
npm test              # ng test — NOTE: no karma config or *.spec.ts files exist in this repo currently
```

There is no lint script configured. `angular.json` defines only a default (non-production) `build` configuration — there is no `production` configuration block, so `ng build --configuration production` will fail; plain `ng build` is what CI/deploy should use.

Note: `firebase.json` hosting `public` points to `dist`, but the Angular build output path (`angular.json`) is `dist/app` — check this mismatch before wiring up `firebase deploy`.

## Architecture

Everything lives under `src/app/`. This is a small standalone-components Angular app (no NgModules) with a single route.

- **`main.ts`** — bootstraps `AppComponent`, wires up `provideRouter`, and initializes `@angular/fire` (`provideFirebaseApp`, `provideDatabase`) using `environment.firebase` config from `src/environments/`.
- **`app.component.ts`** — root shell (header + `<router-outlet>`) and the single route table (`routes`), which maps `''` to `OverviewComponent`. Add new routes here.
- **`models.ts`** — all shared domain types: `Team`, `Competitor`, `Discipline`, `Result`, `CompetitorRanking`, `TeamRanking`, `AppState`. Category is always `'M' | 'Ž'` (men/women), never open-ended.
- **`competition.service.ts`** — the single source of truth. Holds an `AppState` (`teams`, `disciplines`, `results`) in a `BehaviorSubject` (`state$` / `.value`), subscribed to the Firebase Realtime Database root via `onValue`. All mutations (`addTeam`, `updateTeam`, `deleteTeam`, `addResult`, `updateResult`, `deleteResult`, `addDiscipline`, etc.) read the current in-memory state, compute the next array, and `set()` the *entire* collection (`teams`, `disciplines`, or `results`) back to Firebase — there's no per-record write, so any mutation replaces the whole list at that path. IDs are assigned client-side as `max(existing ids) + 1` (not Firebase push keys). Related records are cleaned up together (e.g. `deleteTeam` also strips that team's members' `results`; `deleteDiscipline` strips `results` in that discipline).
- **Scoring formula** — `calculateTotalPoints()` in `competition.service.ts` hardcodes a category-specific weighted formula keyed by discipline **name** (`'TRAP'`, `'ZRAČNA PUŠKA'`, `'PRAČKA'`, `'PIKADO'`), designed so each discipline contributes ~100 points max regardless of its raw scoring range. Men and women use different discipline sets/weights. If discipline names change, this formula must be updated in lockstep since it doesn't look up disciplines by ID.
- **`overview.component.ts`** — the main (and only) screen: renders individual and team rankings (via `CompetitionService.getCompetitorRankings()` / `getTeamRankings()`), category filter, and opens the dialogs below via `MatDialog`. This is the largest component (~600 lines) and the place most feature work happens.
- **`dialogs/`** — Material dialogs for CRUD, each a standalone component paired with the service call it drives: `add-team.dialog.ts` / `edit-team.dialog.ts` (teams + up to 3 members each, per `addCompetitorToTeam`), `add-result.dialog.ts` / `edit-result.dialog.ts` (results per competitor/discipline).
- **`pdf-report.service.ts`** — generates PDF exports (individual ranking, team ranking, or a combined report) using `jsPDF` + `jspdf-autotable`. Themed blue for individual / green for team, gold-silver-bronze row highlighting for top 3. See `PDF_EXPORT_README.md` for the full feature description and filename conventions.
- **`environments/`** — `environment.ts` (dev) and `environment.prod.ts` hold the Firebase project config (API key, database URL, etc.) consumed by `main.ts`. There's no `fileReplacements` wired in `angular.json`, so `environment.prod.ts` is not currently swapped in during build — confirm before assuming prod config is used.

## Firebase

- Realtime Database rules (`database.rules.json`) are fully open (`.read`/`.write: true`) — see `FIREBASE_SETUP.md` for the intended setup and the note that this is not production-safe.
- The service reads/writes at the database root level (`teams`, `disciplines`, `results` as top-level keys), not nested under `competition-data/` as `FIREBASE_SETUP.md`'s "Struktura podataka" section describes — the docs are stale relative to `competition.service.ts`.
