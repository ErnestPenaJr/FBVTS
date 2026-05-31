# Volunteer Scheduler (FBVTS)

A mobile-first volunteer scheduling app. Volunteers register, browse recurring
**services** and one-off **events**, and sign up for open **positions**.
Managers configure campuses and service times; Event Managers create events.

> This is a **frontend-only vertical slice**: React + TypeScript + Vite +
> Tailwind. There is no backend yet — auth is simulated and all data persists
> to the browser's `localStorage`, seeded with demo content on first load.

## Features in this slice

- **Register / fake auth** — pick a demo account or register a new one, choosing
  a role (Volunteer / Manager / Event Manager).
- **Browse & sign up** — services (recurring weekly slots) and events (dated),
  each with positions showing live "X of Y filled" capacity.
- **My Schedule** — see and cancel everything you've signed up for.
- **Manage (role-gated)** — only **Managers** can add campuses and service
  times; **Event Managers** (and Managers) can create events. This implements
  the "must have a Manager level to add campus and service times" requirement.
- **Profile** — upload a photo, edit name/phone/bio, and switch role (demo).
- **Accessibility-minded** — mobile-first layout, large tap targets, and a
  **Text size** setting (Normal / Large / Extra large) for older users.

## Roles

| Role | Can sign up | Create events | Add campuses & service times |
| --- | :---: | :---: | :---: |
| Volunteer | ✓ | | |
| Event Manager | ✓ | ✓ | |
| Manager | ✓ | ✓ | ✓ |

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
```

Demo accounts (on the login screen): Pat Rivera (Manager), Jordan Lee
(Event Manager), Sam Carter (Volunteer). To reset all data, clear the
`fbvts-state-v1` key from localStorage.

## Project structure

```
src/
  context/AppContext.tsx   # global state, localStorage persistence, all actions
  data/mockData.ts         # seed users, campuses, services, events
  components/              # Layout (nav), Avatar, RoleBadge, PositionList
  pages/                   # Login, Home, ServiceDetail, EventDetail,
                           # Schedule, Manage, Profile
  types.ts
```

## Next steps (not in this slice)

- Real backend + database and authentication
- Per-occurrence dates for recurring services (this slice signs up per slot)
- Notifications / reminders, team messaging, manager rosters & approvals
```
