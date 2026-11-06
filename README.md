# Movietime

[![CI](https://github.com/EraEKV/react_movietime/actions/workflows/ci.yml/badge.svg)](https://github.com/EraEKV/react_movietime/actions/workflows/ci.yml)

Plan what to watch, and watch it together.

Movietime is a React single-page application for movies and TV series. You discover titles
from [TMDB](https://developer.themoviedb.org/docs), see how every episode of a series is rated,
keep a personal library, collect titles into lists, and turn a series or a list of movies into
a **watch schedule** on a calendar. Lists and schedules can be shared with friends by link or
with an editor / viewer role.

**Live demo:** https://react-movietime.vercel.app

> React end-term project (KBTU), built on top of the midterm version.
> **Status:** all planned features are implemented, deployed and covered by tests; see the
> [roadmap](docs/PROJECT_PLAN.md#5-roadmap). Web push is out of scope; sharing sends in-app
> notifications and invite links instead.

![Discover page with filters](docs/screenshots/discover-dark.jpg)

## Features

### Catalog

- ✅ **Movies and series catalogs** (one page, switched by a Movies/Series control) with
  server-side search (debounced), five filters (genre, year, minimum rating, original language,
  plus runtime for movies or status for series), five sort orders, pagination and a page size of
  20 / 40 / 60. Everything lives in the URL, so links can be shared and back/forward works.
- ✅ **Series page**: overview, seasons, trailer, cast and recommendations.
- ✅ **Episode ratings heatmap**: every episode of every season colored by its TMDB rating,
  with season averages, best and lowest episode, and an episode panel.
- ✅ **Movie page**: overview, director, budget, revenue, runtime, release date, trailer, cast
  and recommendations.

### Personal data

- ✅ **Authentication**: email/password with validation and email verification, Google
  sign-in, persistent session, protected routes.
- ✅ **Library** (the midterm watchlist, now for movies and series): status, score 1–10, notes
  and episode progress for each title; status tabs with counts, search, type, genre and sort in
  the URL, rows or poster grid, undo for changes and removals. Guests keep it in `localStorage`
  (synced across tabs), signed-in users in Firestore in real time. On sign-in the guest library
  is merged into the account, and the midterm watchlist is moved into it once.
- ✅ **Lists**: named collections of movies and series with an emoji cover and a poster
  collage; create, rename, delete with confirm; add titles from a search picker, from a title
  page or a catalog card; per-title notes; remove with undo. Stored in Firestore, live.
- ✅ **Sharing**: share a list by link (read-only, works for guests) or add friends by email
  as **editor** or **viewer**; change roles, remove access with undo, leave a list, copy a
  shared list to your own. "Shared with me" on the Lists and Home pages. Access is enforced by
  Firestore security rules (member access needs a verified email). Plans are shared the same
  way.
- ✅ **Watch Planner**: turn a series (from your last watched episode, the start or any episode)
  or a list of movies into viewing sessions on the weekdays and time you pick, with a live
  preview of sessions, hours and the finish date. Month calendar (agenda on phones), "Today"
  with _Mark as watched_, plans by week with mark / reschedule (optionally shifting later
  sessions) / skip / undo, `.ics` export, sharing with editors and viewers. Marking a session
  moves your library progress and completes the title on the last one. "Up next" on Home and a
  "Tonight" chip in the header.
- ✅ **Dashboard**: six statistics (titles, completed, average score, hours watched, sessions
  this week, active plans) and four breakdowns (status, top genres, movies vs series, sessions
  by weekday) for all time, 30 days or this year (`?period=`). Tiles and bars open the library
  with the same filter; upcoming sessions open their plan. Works for guests from the local
  library.
- ✅ **Invitations and notifications**: when an owner adds someone to a list or plan, that
  person gets a bell notification (unread counter, live) with _Open_, _Mark as read_ and
  _Decline_ (leave). For people who may not have an account, the share dialog gives an invite
  link (copy, the phone's share sheet, or a prefilled email) that opens sign-up with the email
  filled in and then the list or plan. The app never checks whether an account exists, and
  there is no mail server: the notification waits for the verified email.
- ✅ **Profile**: account info, counters and an activity feed; settings for display name, theme
  and language.
- ✅ **Languages**: English, Русский, Қазақша from the header menu or the settings. The choice is
  saved in the account, applies without a reload and is sent to TMDB (`language=ru-RU`), so
  titles and overviews are translated too.

### App

- ✅ Loading skeletons, error states with retry, empty states, responsive layout.
- ✅ Light / dark theme that follows the system by default, with a toggle in the header.
- ✅ **Installable PWA with offline support**: own Workbox service worker, precached app shell,
  cached TMDB responses and images, an offline pill and an update prompt (see
  [PWA notes](#pwa-notes)).
- ✅ **Tests**: 109 unit and component tests with Vitest and React Testing Library.

## Screenshots

Both themes follow the system setting and can be switched in the header.

| Dark                                                   | Light                                                    |
| ------------------------------------------------------ | -------------------------------------------------------- |
| ![Discover, dark](docs/screenshots/discover-dark.jpg)  | ![Discover, light](docs/screenshots/discover-light.jpg)  |
| ![Series page, dark](docs/screenshots/series-dark.jpg) | ![Series page, light](docs/screenshots/series-light.jpg) |

| Episode ratings                                  | Library                                  | Dashboard                                    |
| ------------------------------------------------ | ---------------------------------------- | -------------------------------------------- |
| ![Episode heatmap](docs/screenshots/heatmap.jpg) | ![Library](docs/screenshots/library.jpg) | ![Dashboard](docs/screenshots/dashboard.jpg) |

| Mobile, dark                                                                | Mobile, light                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| <img src="docs/screenshots/mobile-dark.jpg" width="260" alt="Mobile, dark"> | <img src="docs/screenshots/mobile-light.jpg" width="260" alt="Mobile, light"> |

## Tech stack

- **React 19** + **TypeScript** (strict) + **Vite**, **React Router** (declarative mode)
- **Redux Toolkit**: global state (`preferences`, `auth`, `library`) with listener middleware
- **Firebase**: Authentication (email/password, Google), Cloud Firestore
- **TMDB API** for movies and series
- **CSS Modules** on design tokens (`shared/styles/tokens.css`), dark and light themes via `data-theme`
- Plain `fetch` + custom hooks for TMDB, `onSnapshot` + custom hooks for Firestore
- `i18next` + `react-i18next`: en / ru / kk, dictionaries are JSON files in `public/locales/`, split by feature and loaded on demand
- **Service worker** written with Workbox (`vite-plugin-pwa`, `injectManifest` mode)
- **Vitest** + **React Testing Library**
- **ESLint** (`typescript-eslint`) + **Prettier**

## Getting started

Requirements: Node.js 20+, a free
[TMDB API Read Access Token](https://www.themoviedb.org/settings/api) and a Firebase project
(see [docs/FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md)).

```bash
git clone https://github.com/EraEKV/react_movietime.git
cd react_movietime
npm install
cp .env.example .env.local   # fill in the values, see below
npm run dev
```

| Script                  | Description                                  |
| ----------------------- | -------------------------------------------- |
| `npm run dev`           | Start the dev server                         |
| `npm run build`         | Type-check, then production build to `dist/` |
| `npm run typecheck`     | Type-check with `tsc -b`                     |
| `npm run preview`       | Serve the production build                   |
| `npm run lint`          | Lint with ESLint                             |
| `npm run format`        | Format with Prettier                         |
| `npm run format:check`  | Check formatting                             |
| `npm test`              | Run all tests once (Vitest)                  |
| `npm run test:watch`    | Run tests in watch mode                      |
| `npm run check:locales` | Check that en / ru / kk dictionaries match   |
| `npm run emulators`     | Local Firebase emulators (needs Java 21)     |

### Tests

```bash
npm test             # run once, as in CI
npm run test:watch   # re-run on change
```

109 tests in 13 files: pure logic (schedule, stats, filters, validation, catalog paging),
Redux slices, hooks (`useFetch`, `useDebouncedValue`) and components (pagination, signup
validation, protected routes, and others). Vitest runs in `jsdom`; `src/test/setup.ts` loads the
real English dictionaries from `public/locales` and stubs `matchMedia`. Tests need no network,
no Firebase and no environment variables.

### Continuous integration

GitHub Actions (`.github/workflows/ci.yml`) runs on every push and on pull requests to `main`,
on Node 22 (`.nvmrc`). It needs no secrets: the build works without `VITE_*` values, Vercel
injects them for the real deployment. Steps, in order:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. Prettier check over all tracked files
5. `npm run check:locales` (en, ru and kk dictionaries have the same keys)
6. `npm run test:coverage` (Vitest with the v8 coverage report)
7. `npm run build`

The coverage report is uploaded as the `coverage` artifact of the run. `npm audit` reports
high-severity advisories but does not fail the run. Dependabot opens weekly grouped updates
for npm packages and GitHub Actions.

### Local Firebase emulators (optional)

`npm run emulators` starts the Auth and Firestore emulators (Firestore on port 8180, needs
Java 21). With `VITE_USE_EMULATORS=true npm run dev` the app talks to them instead of the real
project, which is handy for trying security rules without touching production data.

### Environment variables

| Name                                | Required | Description                                    |
| ----------------------------------- | :------: | ---------------------------------------------- |
| `VITE_TMDB_TOKEN`                   |   yes    | TMDB API Read Access Token (sent as Bearer)    |
| `VITE_FIREBASE_API_KEY`             |   yes    | Firebase web app config                        |
| `VITE_FIREBASE_AUTH_DOMAIN`         |   yes    | `<project-id>.firebaseapp.com`                 |
| `VITE_FIREBASE_PROJECT_ID`          |   yes    |                                                |
| `VITE_FIREBASE_STORAGE_BUCKET`      |   yes    |                                                |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` |   yes    |                                                |
| `VITE_FIREBASE_APP_ID`              |   yes    |                                                |
| `VITE_FIREBASE_MEASUREMENT_ID`      |    no    | Only for Google Analytics, not used by the app |
| `VITE_USE_EMULATORS`                |    no    | `true` connects to the local emulators (dev)   |

`.env.local` is git-ignored. All of these values end up in the client bundle, which is
expected: the TMDB read token is read-only and rate-limited, and the Firebase web config only
identifies the project. User data is protected by Firestore security rules.

## API documentation

Full reference: **[docs/API.md](docs/API.md)** (service functions) and
**[docs/DATA_MODEL.md](docs/DATA_MODEL.md)** (schemas, security rules, indexes).

### Resources

| Resource                | Backend                                  | Operations                                                                   |
| ----------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Titles (movies, series) | TMDB REST                                | List with search, filters, sort, paging; details by id; seasons and episodes |
| Library entries         | Firestore `users/{uid}/library`          | Create, read, update, delete (owner only)                                    |
| Lists + items           | Firestore `lists`, `lists/{id}/items`    | Full CRUD; shared by link or roles                                           |
| Plans + sessions        | Firestore `plans`, `plans/{id}/sessions` | Generate, complete, reschedule, skip, delete                                 |
| Profile, activity       | Firestore `users/{uid}`                  | Read, update                                                                 |
| Notifications           | Firestore `notifications`                | Create (owner, with the invite), read, mark read, delete (recipient)         |

### TMDB endpoints

| Endpoint                                                                                | Used for           |
| --------------------------------------------------------------------------------------- | ------------------ |
| `GET /discover/tv`, `GET /discover/movie`                                               | Catalogs           |
| `GET /search/tv`, `GET /search/movie`                                                   | Search             |
| `GET /tv/{id}`, `GET /movie/{id}` + `append_to_response=credits,videos,recommendations` | Details            |
| `GET /tv/{id}?append_to_response=season/1,…`                                            | Heatmap, planner   |
| `GET /genre/{tv,movie}/list`, `GET /trending/{tv,movie}/week`                           | Filters, home page |

### App URL parameters (catalog)

`/movies` and `/series` accept `q`, `genre`, `year`, `rating`, `lang`, `status` (series),
`runtime` (movies), `sort`, `page` and `size`. Invalid values fall back to defaults. Details:
[DATA_MODEL.md → Catalog query parameters](docs/DATA_MODEL.md#catalog-query-parameters-app-url--tmdb).

## PWA notes

- **Install:** open the deployed site in Chrome or Edge and use the install icon in the address
  bar, or "Add to Home Screen" on Android and iOS. The manifest has 192/512 and maskable icons.
- **Offline:** the app shell, all JS/CSS chunks and the dictionaries are precached, so the app
  opens and routes without a network. TMDB responses use network-first (the last response is
  shown offline), poster images use cache-first, and Firestore keeps user data in its persistent
  cache and queues writes. An "Offline" pill appears in the header; `/offline` is the fallback
  page for a navigation that nothing can serve.
- **Updates:** a new build installs in the background; the user sees the toast "A new version
  of Movietime is ready" and the app reloads on "Reload". Until then the old version keeps working.
- The service worker is plain Workbox code in [`src/sw.ts`](src/sw.ts); `vite-plugin-pwa` only
  injects the precache manifest (`injectManifest`). It is registered in production builds only.

## Routes

| Route                                     | Page             | Access                    |
| ----------------------------------------- | ---------------- | ------------------------- |
| `/`                                       | Home             | public                    |
| `/about`                                  | About            | public                    |
| `/login`, `/signup`                       | Login, Signup    | guests only               |
| `/movies`, `/series`                      | Catalog          | public                    |
| `/movies/:id`, `/series/:id`              | Title details    | public                    |
| `/library`, `/library/:key/edit`          | Library          | public (local for guests) |
| `/lists`, `/lists/new`, `/lists/:id/edit` | Lists management | signed in                 |
| `/lists/:id`                              | List             | owner, members, link      |
| `/planner`, `/planner/new`                | Planner          | signed in                 |
| `/planner/:id`                            | Plan             | owner, members, link      |
| `/dashboard`                              | Dashboard        | public (local for guests) |
| `/profile`, `/profile/settings`           | Profile          | signed in                 |
| `/offline`                                | Offline          | public                    |
| `*`                                       | Not found        | public                    |

An invite link, `/signup?invite=lists/<id>&email=<email>`, prefills the email and, after
sign-up and email verification, opens that list (`plans/<id>` opens the plan).

## Project structure

```
src/
├── shared/       code with no business meaning, imports nothing from the rest of src
│   ├── ui/       UI kit: Button, Dialog, Menu, Field, Tabs, Toast, Skeleton, …
│   ├── hooks/    useFetch, useRequest, useSubscription, useDebouncedValue, useMediaQuery, …
│   ├── lib/      cx, format, relativeTime, validation, rovingFocus, rating, …
│   ├── api/      TMDB client and endpoint builders
│   ├── i18n/     i18next setup, typed keys, Intl helpers
│   ├── styles/   global styles, design tokens, themes
│   └── types/    app-wide types (Option, Language, Theme)
├── components/   app components: layout, catalog, library, lists, planner, dashboard, …
├── pages/        one file per route
├── hooks/        hooks with app data: auth, library, lists, planner, sharing, …
├── services/     Firebase: auth, profile, library, lists, sharing, notifications, planner
├── storage/      localStorage modules
├── store/        Redux store, slices, typed hooks
├── types/        TypeScript types for TMDB responses and app data
├── utils/        pure domain helpers: filters, schedule, stats, sharing, …
├── test/         Vitest setup (tests live next to the code as *.test.ts[x])
└── sw.ts         service worker (Workbox)
```

`src/shared` must not import from the rest of `src`; an ESLint `no-restricted-imports` rule
enforces it.

How it fits together, where each piece of state lives and why, and the React patterns used
(effects and cleanup, race conditions, keys): **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Documentation

| Document                                    | Content                                                   |
| ------------------------------------------- | --------------------------------------------------------- |
| [PROJECT_PLAN.md](docs/PROJECT_PLAN.md)     | Features, roadmap, requirements checklist                 |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)     | Folder structure, routing, state, caching, React patterns |
| [API.md](docs/API.md)                       | Service modules, hooks                                    |
| [DATA_MODEL.md](docs/DATA_MODEL.md)         | TMDB resources, Firestore schema, security rules          |
| [FIREBASE_SETUP.md](docs/FIREBASE_SETUP.md) | Configuring Firebase and Vercel                           |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md)     | Branches and commit conventions                           |

## Deployment

Deployed on **Vercel** from `main`: https://react-movietime.vercel.app

- `vercel.json` rewrites every path to `index.html`, so deep links work on refresh.
- Environment variables are set in the Vercel project settings.
- Firebase (Auth + Firestore) is a hosted backend, so the deployed app doesn't depend on a
  local machine. The production domain is listed in Firebase Auth authorized domains.

## Credits

This product uses the TMDB API but is not endorsed or certified by TMDB. Movie and series data
and images © [The Movie Database](https://www.themoviedb.org/).
