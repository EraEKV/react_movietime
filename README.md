# Movietime

Plan what to watch, and watch it together.

Movietime is a React single-page application for movies and TV series. You discover titles
from [TMDB](https://developer.themoviedb.org/docs), see how every episode of a series is rated,
keep a personal library, collect titles into lists, and turn a series or a list of movies into
a **watch schedule** on a calendar. Lists and schedules can be shared with friends by link or
with an editor / viewer role.

**Live demo:** https://react-movietime.vercel.app

> React end-term project (KBTU), built on top of the midterm version.
> **Status:** midterm features are done. End-term features are in progress; see the
> [roadmap](docs/PROJECT_PLAN.md#5-roadmap).

![Discover page with filters](docs/screenshots/discover.jpg)

## Features

Legend: ✅ implemented, 🚧 in progress.

### Catalog

- ✅ **Series catalog** with server-side search (debounced), filters (genre, year, minimum
  rating, status), five sort orders and pagination. Everything lives in the URL, so links can be
  shared and back/forward works.
- 🚧 **Movies catalog** with the same UI, a 5th filter on both catalogs (original language;
  runtime for movies) and a configurable page size (20 / 40 / 60).
- ✅ **Series page**: overview, seasons, trailer, cast and recommendations.
- ✅ **Episode ratings heatmap**: every episode of every season colored by its TMDB rating,
  with season averages, best and lowest episode, and an episode panel.
- 🚧 **Movie page**: details, cast, trailer, recommendations.

### Personal data

- ✅ **Watchlist** (midterm): add, edit, remove with undo, search, tabs, sort, pagination,
  saved in `localStorage` and synced across tabs.
- 🚧 **Authentication**: email/password with validation and email verification, Google
  sign-in, persistent session, protected routes.
- 🚧 **Library**: your status, score, notes and episode progress for each title. Guests keep it
  locally, signed-in users in Firestore. The guest library is merged into your account on sign-in.
- 🚧 **Lists**: named collections of titles with full CRUD.
- 🚧 **Sharing**: share a list or a plan by link (read-only) or add friends by email as
  **editor** or **viewer**. Access is enforced by Firestore security rules.
- 🚧 **Watch Planner**: generate a schedule of viewing sessions from a series' episodes or a
  list of movies, then complete, reschedule or skip sessions. Your library progress updates
  automatically. Export to `.ics`.
- 🚧 **Dashboard**: statistics and breakdowns of your library and plans, with filters and
  links to the matching records.
- 🚧 **Profile**: account info, activity, settings.

### App

- ✅ Loading skeletons, error states with retry, empty states, responsive layout.
- 🚧 Light / dark theme, English / Russian / Kazakh (also for TMDB content).
- 🚧 Installable PWA with offline support.

| Series page                                     | Episode ratings                                  |
| ----------------------------------------------- | ------------------------------------------------ |
| ![Series details](docs/screenshots/details.jpg) | ![Episode heatmap](docs/screenshots/heatmap.jpg) |

| Watchlist                                    | Mobile                                        |
| -------------------------------------------- | --------------------------------------------- |
| ![Watchlist](docs/screenshots/watchlist.jpg) | ![Mobile layout](docs/screenshots/mobile.jpg) |

## Tech stack

- **React 19** + **Vite**, **React Router** (declarative mode)
- **Firebase**: Authentication (email/password, Google), Cloud Firestore
- **TMDB API** for movies and series
- **CSS Modules** with design tokens
- Plain `fetch` + custom hooks for TMDB, `onSnapshot` + custom hooks for Firestore
- 🚧 `react-i18next`, `vite-plugin-pwa`
- **ESLint** + **Prettier**

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

| Script                 | Description                 |
| ---------------------- | --------------------------- |
| `npm run dev`          | Start the dev server        |
| `npm run build`        | Production build to `dist/` |
| `npm run preview`      | Serve the production build  |
| `npm run lint`         | Lint with ESLint            |
| `npm run format`       | Format with Prettier        |
| `npm run format:check` | Check formatting            |

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
| `/dashboard`                              | Dashboard        | signed in                 |
| `/profile`, `/profile/settings`           | Profile          | signed in                 |
| `*`                                       | Not found        | public                    |

## Project structure

```
src/
├── api/          TMDB client and endpoint builders
├── services/     Firebase: auth, profile, library, lists, sharing, planner
├── storage/      localStorage modules
├── context/      global state providers
├── hooks/        custom hooks
├── components/   reusable UI, one folder per component + CSS Module
├── pages/        one file per route
├── styles/       global styles, design tokens, themes
└── utils/        pure helpers: filters, formatting, schedule, stats
```

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
