# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Volunteer Scheduler (FBVTS) — a **frontend-only vertical slice** of a mobile-first
volunteer & event sign-up app. React 19 + TypeScript + Vite + Tailwind v4. There is
**no backend**: auth is simulated and all data lives in `localStorage`, seeded with
demo content on first load.

## Commands

```bash
npm run dev      # Vite dev server at http://localhost:5173
npm run build    # tsc -b (type-check across project refs) then vite build
npm run lint     # tsc -b --noEmit — type-check only; this is the only "lint"
npm run preview  # serve the production build locally
```

There is **no test runner and no ESLint** configured. CI (`.github/workflows/ci.yml`)
runs `npm run build` only — type errors are the gate, so keep `npm run lint` clean.

## Architecture

**Single source of truth: `src/context/AppContext.tsx`.** All application state and
every mutating action lives here. There is no Redux/Zustand/server layer — the entire
app is a `useState` holding a `PersistedState` object that is serialized to
`localStorage` under the key `fbvts-state-v1` on every change (via `useEffect`).
Components read state and call actions through the `useApp()` hook.

Key consequences of this design:
- **Adding a feature usually means adding an action to `AppContext`** (and a field to
  `PersistedState` / `types.ts` if new data is involved), then consuming it via `useApp()`.
- All IDs are generated client-side with the `uid(prefix)` helper.
- To reset everything, clear the `fbvts-state-v1` localStorage key.
- Derived/role flags (`isManager`, `isEventManager`) and lookups (`campusName`,
  `positionFilled`) are computed in the context value, not stored.

**Domain model (`src/types.ts`):**
- `ServiceTime` — recurring weekly slot at a campus (dayOfWeek + time). `AppEvent` —
  one-off dated event. Both own a list of `Position`s (title + `needed` count).
- A `Signup` links a user to a position via `{ kind: 'service' | 'event', refId, positionId }`,
  where `refId` is a serviceTimeId or eventId. Capacity ("X of Y filled") is computed by
  counting matching signups (`positionFilled`), never stored.

**Roles & gating:** three roles (`volunteer`, `event_manager`, `manager`). Permission
checks use the derived flags from context: `isEventManager` (true for event managers AND
managers) gates event creation and the Manage nav item; `isManager` gates adding campuses
and service times. This enforces the rule "must have Manager level to add campus and
service times." Managers also see the volunteer roster on detail pages (`Roster.tsx`);
regular volunteers do not, for privacy.

**Routing (`src/App.tsx`):** React Router v7. All app routes are nested under a
`RequireAuth` + `Layout` wrapper that redirects to `/login` when there's no current user.
`netlify.toml` has a SPA fallback redirect so deep links / refreshes serve `index.html`.

**Layout (`src/components/Layout.tsx`):** one responsive shell — a fixed left sidebar on
`md+` screens, a top header + bottom tab bar on mobile. The nav `items` array is the single
place to add/remove navigation, and is filtered by role.

## Styling conventions

- **Tailwind v4** configured via the Vite plugin (`@tailwindcss/vite`); no `tailwind.config`
  file. The custom `brand-*` color scale (teal) is defined in `@theme` inside `src/index.css`.
- **Accessibility for older volunteers is a core constraint.** Root `font-size` is set at
  runtime by `AppContext` based on the user's font-scale setting (compact/normal/large/xlarge).
  **All spacing must be `rem`-based** so the whole UI scales together — avoid `px` sizing.
  Base CSS enforces generous min tap-target sizes for form controls and buttons.
