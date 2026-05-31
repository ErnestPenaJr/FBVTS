# Volunteer Scheduler (FBVTS)

<!--
  Deploy badge + live link. Replace the two placeholders below with your
  Netlify values, then this badge turns green/red with each deploy:
    SITE_API_ID  – Netlify → Site settings → General → "Site ID"
    SITE_NAME    – your site's subdomain (the part before .netlify.app)
-->
[![Netlify Status](https://api.netlify.com/api/v1/badges/SITE_API_ID/deploy-status)](https://app.netlify.com/sites/SITE_NAME/deploys)

🔗 **Live site:** https://SITE_NAME.netlify.app

A responsive volunteer scheduling app — mobile-first, with a full desktop/web
layout (left sidebar nav + multi-column lists on larger screens). Volunteers register, browse recurring
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
- **Manager roster** — on a service/event, managers see *who* signed up for each
  position (with contact phone) and can remove a volunteer. Hidden from regular
  volunteers for privacy.
- **Profile** — upload a photo, edit name/phone/bio, and switch role (demo).
- **Responsive** — a phone layout with a bottom tab bar on small screens, and a
  desktop layout with a persistent left sidebar and multi-column lists on wider
  screens. Same app, one codebase.
- **Accessibility-minded** — finger-friendly tap targets,
  and a comfortable default text size for older volunteers. A **Text size**
  setting (Compact / Default / Large / Largest) lets anyone adjust; because all
  spacing is `rem`-based, the whole UI scales together.
- **Feedback & empty states** — confirmation toasts on sign-up, cancel, profile
  save, and manager actions; friendly empty states when there's nothing to show.

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
