# Movietime — End-Term Project Plan

This document describes what Movietime will become for the React end-term project: the scope,
the features, the order of work, and how every grading requirement is covered.

Related docs:

- [DATA_MODEL.md](DATA_MODEL.md): TMDB resources, Firestore collections, security rules
- [API.md](API.md): service modules and their functions
- [ARCHITECTURE.md](ARCHITECTURE.md): routes, providers, state, React patterns
- [FIREBASE_SETUP.md](FIREBASE_SETUP.md): how to configure the Firebase project
- [CONTRIBUTING.md](CONTRIBUTING.md): branches and commit conventions

## 1. Idea

**Movietime is a planner for watching movies and TV series together.**

You discover titles from TMDB, track them in your personal library, collect them into named
lists, and turn a series (or a list of movies) into a **watch schedule** on a calendar. Lists
and schedules can be shared with friends, either as a read-only link or with an editor role.

What makes it different from a typical "movie catalog" project:

1. **Episode ratings heatmap**: every episode of every season colored by rating (already built).
2. **Watch Planner**: generates a calendar of viewing sessions from real episode data and
   updates your progress as you complete sessions.
3. **Shared lists and plans with roles**: owner / editor / viewer access, enforced by
   Firestore security rules, not only by the UI.

## 2. Entities

| Entity        | Source                          | Role in the requirements                    |
| ------------- | ------------------------------- | ------------------------------------------- |
| Title         | TMDB (movies + TV series)       | **Primary entity** (Items)                  |
| Library entry | Firestore `users/{uid}/library` | Personalized data (status, score, progress) |
| List          | Firestore `lists`               | **Secondary entity**: full CRUD             |
| Plan          | Firestore `plans`               | **Third resource**: business feature        |
| Session       | Firestore `plans/{id}/sessions` | Part of a plan: one viewing on one date     |
| Profile       | Firestore `users/{uid}`         | Account info and settings                   |

A title is identified by a **media key**: `${mediaType}_${tmdbId}`, for example `tv_1396`
(Breaking Bad) or `movie_27205` (Inception). The same key is used as the document id in the
library and in list items, so a title can't be added twice to the same place.

Full schemas: [DATA_MODEL.md](DATA_MODEL.md).

## 3. Features

### 3.1 Catalog (primary entity: Items)

- Two catalogs with the same UI: **Movies** (`/movies`) and **Series** (`/series`).
- Data comes from TMDB `/discover/movie` and `/discover/tv` (hundreds of thousands of records).
- Server-side search (`/search/movie`, `/search/tv`) with a 400ms debounce.
- **Filters (5 per catalog):**

  | Filter            | Movies                         | Series                   |
  | ----------------- | ------------------------------ | ------------------------ |
  | Genre             | `with_genres`                  | `with_genres`            |
  | Year              | `primary_release_year`         | `first_air_date_year`    |
  | Minimum rating    | `vote_average.gte`             | `vote_average.gte`       |
  | Original language | `with_original_language`       | `with_original_language` |
  | 5th filter        | Max runtime `with_runtime.lte` | Status `with_status`     |

- **Sorting:** popularity, rating, vote count, newest, oldest.
- **Pagination with page size** 20 / 40 / 60. TMDB always returns 20 results per page, so a
  page size of 40 loads two TMDB pages in parallel (`Promise.all`) and joins them. This is still
  server-side pagination: nothing is filtered on the client.
- All of it lives in the URL (`useSearchParams`): `?q=&genre=&year=&rating=&lang=&status=&sort=&page=&size=`.
- Stale responses are dropped (AbortController + ignore flag), unchanged values don't refetch.

### 3.2 Title details

- `/movies/:id`: poster, backdrop, overview, release date, runtime, genres, rating, vote count,
  budget/revenue, cast, trailer, recommendations.
- `/series/:id`: everything above for TV, plus seasons and the **episode ratings heatmap**.
- Actions: add to library, change status, add to a list, **plan watching**.
- Invalid ids show a "not found" state, network errors show retry.

### 3.3 Authentication

- Firebase Authentication with **Email/Password** and **Google** (`signInWithPopup`).
- Signup validation: valid email, password ≥ 8 characters with at least one number and one
  special character, password confirmation, display name.
- After email signup a verification email is sent. Verification is required to receive shared
  access by email (see 3.6), because the security rules check `email_verified`.
- Session persists across reloads (Firebase default `browserLocalPersistence`).
- The `auth` slice in the Redux store holds `{ user, status, error }`. While Firebase restores the session, the
  app shows a loader instead of flashing the login page.
- `ProtectedRoute` redirects guests to `/login?redirect=<original path>`.
  `GuestRoute` redirects signed-in users away from `/login` and `/signup`.
- The header shows the avatar, name and a menu (Profile, Dashboard, Sign out).

### 3.4 Library (personalized data)

The evolved version of the midterm watchlist. One record per title with your **status**
(plan to watch / watching / completed / dropped), **score** (1–10), **notes** and **progress**
(last watched season and episode).

- **Guests** keep the library in `localStorage` (the midterm behaviour).
- **Signed-in users** keep it in Firestore `users/{uid}/library`.
- **On sign-in, the guest library is merged** into Firestore (titles that are already there
  are kept as they are), then local storage is cleared.
- Library page: search, status tabs, sort, pagination, filters from the URL so that the
  dashboard can link to `/library?status=completed&genre=18`.

### 3.5 Lists (secondary entity: full CRUD)

Named collections of titles, for example "Weekend movies" or "Anime with Dan".

- **Create** a list: name (required, 1–60 chars), description (≤ 300), emoji cover.
- **Read**: "My lists" and "Shared with me" on `/lists`, a list page at `/lists/:listId`.
- **Update**: rename, change description/emoji, add titles (search picker), write a note per
  title, remove titles.
- **Delete** a list (with confirmation; all its items are deleted in one batch).
- Validation, loading skeletons, error messages, success toasts. Data persists in Firestore.

### 3.6 Sharing with roles

Lists and plans can be shared in two ways at the same time:

1. **Link access**: `visibility: "link"` makes the list readable by anyone with the URL, even
   without an account. Signed-in visitors can **"Copy to my lists"**.
2. **Members with roles**: the owner adds a friend by email and picks a role:

   | Role       | List                                 | Plan                                 |
   | ---------- | ------------------------------------ | ------------------------------------ |
   | **owner**  | everything, incl. delete and sharing | everything, incl. delete and sharing |
   | **editor** | add / remove / annotate titles       | complete and reschedule sessions     |
   | **viewer** | read                                 | read                                 |

- The friend sees the shared item under **"Shared with me"** as soon as they sign in with that
  email. No invitation backend is needed.
- Roles are stored on the document (`roles: { "friend@gmail.com": "editor" }` plus a
  `memberEmails` array for queries) and **enforced by Firestore rules** using
  `request.auth.token.email`. A user who isn't a member gets `permission-denied` from the
  database even if they call the API directly.
- The owner can change a role or remove a member. A member can leave a shared item.

How it works in detail: [DATA_MODEL.md → Sharing](DATA_MODEL.md#sharing-and-roles).

### 3.7 Watch Planner (custom business feature)

This connects the primary entity (TMDB titles and episodes) with the user's data (library,
lists) and creates new data (plans and sessions).

**Create a plan** from a series page, from the library, or from a list:

1. Pick what to watch:
   - a **series**: starts from the next unwatched episode in your library progress (or S1E1);
   - a **list of movies**: one movie per session, in list order.
2. Choose a start date, the weekdays (for example Mon / Wed / Fri), the time, and the pace
   (episodes per session, 1–10).
3. The planner loads every season from TMDB (batched `append_to_response`), skips specials and
   unaired episodes, and **generates the schedule**: a pure function
   `buildSchedule(episodes, options)` splits episodes into sessions and puts each on the next
   allowed weekday.
4. A preview shows the result: number of sessions, total hours, and the finish date. On confirm,
   the plan and all sessions are written in one Firestore batch, and the title is added to the
   library as "watching" if it isn't there yet.

**Use a plan:**

- `/planner` shows a month calendar and an agenda ("Today: Breaking Bad S2E3–E4, 20:00").
- **Complete a session** (batch write): the session becomes done, the plan's progress grows,
  your library progress moves to the last episode of the session. When the last session is done,
  the plan becomes `done` and the title becomes `completed` in your library.
- **Reschedule** a session to another date, optionally **shifting all later sessions** by the
  same number of days.
- **Skip** a session (moves its episodes to the end of the schedule).
- **Export** the plan to an `.ics` file for Google / Apple Calendar.
- Plans can be shared like lists, for example to watch a series together with a friend.

All of this changes stored data and the result is visible right away in the calendar, the
library, the profile activity and the dashboard.

### 3.8 Dashboard

`/dashboard` (protected), computed from the user's real library and plans:

- **Statistics:** titles in library, completed titles, average score, hours watched,
  sessions planned this week, active plans.
- **Breakdowns:** titles by status, titles by genre (top 8), movies vs series,
  sessions by weekday.
- **Interactive:** a period filter (all time / 30 days / this year). Clicking a status or genre
  bar opens `/library` with that filter. Clicking an upcoming session opens its plan.

### 3.9 Profile

`/profile` (protected) with nested routes:

- `/profile`: avatar, name, email, sign-in providers, email verification state, member since,
  counts (library / lists / plans), **recent activity** (added titles, completed sessions,
  created lists).
- `/profile/settings`: edit display name, theme, language, send verification email again,
  sign out.

### 3.10 Bonus features

| Bonus    | Plan                                                                                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme    | Light / dark / system. CSS custom properties under `[data-theme]`. Guests: `localStorage`, users: `users/{uid}.settings.theme`.                                                              |
| i18n     | `react-i18next` with **en / ru / kk**. The language is also sent to TMDB (`language=ru-RU`), so overviews and titles are translated; it's part of every request key, so switching refetches. |
| Sharing  | Link sharing + roles (3.6).                                                                                                                                                                  |
| Planner  | Calendar planner (3.7), `.ics` export.                                                                                                                                                       |
| Firebase | Auth, Firestore, security rules, offline persistence.                                                                                                                                        |

**Out of scope: push notifications (FCM).** Real reminders need a server (Cloud Functions) to
send messages at the planned time, and Cloud Functions require the paid Blaze plan. Instead the
app shows "Today's sessions" in the header and on the dashboard.

### 3.11 PWA and offline (mandatory)

- `vite-plugin-pwa` in **`injectManifest`** mode: the plugin generates the manifest (name,
  icons 192/512 + maskable, `display: standalone`, theme color) and the precache list, and the
  **service worker itself is our own `src/sw.ts`** written with Workbox modules, so every
  caching rule is visible in the code. An update prompt asks the user to reload when a new
  version is installed.
- Precached app shell and static assets.
- Runtime caching: TMDB API **network-first** (falls back to the last response offline),
  TMDB images **cache-first** with an expiration limit.
- Firestore offline persistence (`persistentLocalCache` + multi-tab manager): library, lists
  and plans are readable offline and writes are synced on reconnect.
- A dedicated `/offline` page shown when a required resource isn't cached.
- Online/offline indicator in the header (`useOnlineStatus`).

### 3.12 Tests

Vitest + React Testing Library + jsdom, `npm test`:

- **Pure logic:** `buildSchedule` / `shiftSessions` (planner), `parseFilters` /
  `toDiscoverParams`, signup validation, dashboard stats, `filterWatchlist`.
- **Redux:** reducers and selectors of the `auth`, `library` and `preferences` slices.
- **Hooks:** `useDebouncedValue` with fake timers, `useFetch` race condition (a slow old
  response must not overwrite a newer one) with a mocked `fetch`.
- **Components:** signup form validation messages, `ProtectedRoute` redirect, `Pagination`.
- Optional: Firestore security rules with `@firebase/rules-unit-testing` and the emulator.

## 4. Pages and routes

| Route                 | Page                  | Access    | Lazy | Requirement                 |
| --------------------- | --------------------- | --------- | ---- | --------------------------- |
| `/`                   | `HomePage`            | public    |      | Home                        |
| `/about`              | `AboutPage`           | public    | ✓    | About                       |
| `/login`              | `LoginPage`           | guest     |      | Login                       |
| `/signup`             | `SignupPage`          | guest     |      | Signup                      |
| `/movies`, `/series`  | `CatalogPage`         | public    |      | Items List                  |
| `/movies/:id`         | `MoviePage`           | public    | ✓    | Item Details                |
| `/series/:id`         | `SeriesPage`          | public    | ✓    | Item Details                |
| `/library`            | `LibraryPage`         | public    |      | Favorites (guest + user)    |
| `/library/:key/edit`  | `LibraryEditPage`     | public    |      |                             |
| `/lists`              | `ListsPage`           | protected | ✓    | Secondary Entity Management |
| `/lists/new`          | `ListFormPage`        | protected |      |                             |
| `/lists/:listId`      | `ListPage`            | role/link |      | dynamic route               |
| `/lists/:listId/edit` | `ListFormPage`        | owner     |      |                             |
| `/planner`            | `PlannerPage`         | protected | ✓    | Business feature            |
| `/planner/new`        | `PlanCreatePage`      | protected |      |                             |
| `/planner/:planId`    | `PlanPage`            | role/link |      | dynamic route               |
| `/dashboard`          | `DashboardPage`       | protected | ✓    | Dashboard                   |
| `/profile`            | `ProfilePage`         | protected | ✓    | Profile                     |
| `/profile/settings`   | `ProfileSettingsPage` | protected |      | nested route                |
| `/offline`            | `OfflinePage`         | public    |      | PWA                         |
| `*`                   | `NotFoundPage`        | public    |      | 404                         |

"role/link" pages are public routes: the page decides between owner, editor, viewer, and
"no access" from the document and the rules' answer.

## 5. Roadmap

Each phase is one feature branch and one PR (see [CONTRIBUTING.md](CONTRIBUTING.md)).
Small fixes between phases go straight to `main`.

| #   | Branch                    | Scope                                                                                                                                                          |
| --- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `main` ✅                 | These docs and the README                                                                                                                                      |
| 0.5 | `refactor/typescript` ✅  | Codebase migrated to TypeScript (strict), typed TMDB responses, `typescript-eslint`                                                                            |
| 1   | `feat/firebase-auth`      | Redux store + `auth` slice, Firebase init, auth service, Login/Signup (email + Google), verification, protected/guest routes, user in header, profile document |
| 2   | `feat/routing`            | Home landing, About, catalog moved to `/series`, nested routes, lazy pages, Profile page                                                                       |
| 3   | `feat/movies`             | Movie catalog and details, shared media helpers, 5th filter, language filter, page size                                                                        |
| 4   | `feat/library-firestore`  | Watchlist → Library, Firestore sync, guest merge on sign-in                                                                                                    |
| 5   | `feat/lists`              | Lists CRUD and list items                                                                                                                                      |
| 6   | `feat/sharing`            | Link visibility, members and roles, "Shared with me", copy list, Firestore rules                                                                               |
| 7   | `feat/planner`            | Schedule generation, calendar, complete / reschedule / skip, `.ics` export, plan sharing                                                                       |
| 8   | `feat/dashboard`          | Stats, breakdowns, filters and navigation                                                                                                                      |
| 9   | `feat/theme`              | Theme switcher, settings page                                                                                                                                  |
| 10  | `feat/i18n`               | en / ru / kk, TMDB language                                                                                                                                    |
| 11  | `feat/pwa`                | Manifest, service worker, caching, offline page, status indicator                                                                                              |
| 12  | `test/unit-and-component` | Vitest + Testing Library: logic, slices, hooks, components (see 3.12)                                                                                          |
| 13  | `docs/final-readme`       | Final README, screenshots, defense notes                                                                                                                       |

## 6. Requirements checklist

### Deployment & routing (0.5)

| Requirement                              | How                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| Public HTTPS deployment                  | Vercel: https://react-movietime.vercel.app                                |
| Everything works on the deployed version | Firebase is a hosted backend; Vercel domain in Auth authorized domains    |
| Nested routes, shared layout             | `Layout` → `Outlet`; `/lists/*`, `/planner/*`, `/profile/*`, `/library/*` |
| Dynamic routes                           | `/movies/:id`, `/series/:id`, `/lists/:listId`, `/planner/:planId`        |
| Lazy loading ≥ 3 pages                   | About, Movie, Series, Lists, Planner, Dashboard, Profile                  |
| Custom 404                               | `NotFoundPage` (exists)                                                   |
| ≥ 1 authenticated-only page              | Dashboard, Profile, Lists, Planner                                        |

### Architecture (0.5)

| Requirement                                    | How                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| pages / components / hooks / services / styles | `src/pages`, `src/components`, `src/hooks`, `src/services`, `src/styles`            |
| Logic outside components                       | Firestore and TMDB calls in `src/services` and `src/api`; pure logic in `src/utils` |
| No `localStorage` in UI components             | Only in `src/storage/*` modules                                                     |
| One page per file                              | `src/pages/*Page.tsx`                                                               |

### API & data (0.5)

| Requirement                                                | How                                                                  |
| ---------------------------------------------------------- | -------------------------------------------------------------------- |
| ≥ 3 related resources                                      | Titles (TMDB) → Library/Lists (Firestore) → Plans/Sessions           |
| ≥ 100 items                                                | TMDB: hundreds of thousands of movies and series                     |
| List with search, 5 filters, sort, paging via query params | `/discover/*`, `/search/*`                                           |
| Separate details endpoint, ≥ 7 fields                      | `/movie/:id`, `/tv/:id` (12+ fields)                                 |
| Documented data models                                     | [DATA_MODEL.md](DATA_MODEL.md), TS types in `src/types`              |
| Loading / error / empty / invalid id                       | Skeletons, `StatusMessage` with retry, empty states, not-found state |
| Stale responses                                            | `AbortController` + ignore flag in `useFetch`                        |

### Search & filtering (0.5)

Debounced search, 5 filters, 5 sorts, page + page size, everything in `useSearchParams`,
survives refresh and back/forward, request key is a stable string so unchanged values don't
refetch, out-of-order responses are ignored.

### CRUD & business logic (0.5)

Lists: full CRUD with validation and feedback, persisted in Firestore. Library: add / edit /
remove. Planner: schedule generation, complete / reschedule / skip sessions, updates library
progress and status.

### Authentication (1)

Email/Password + Google, signup validation, login/logout, persistent session, `auth` slice in
the Redux store, protected routes with redirect back, loading and error states, user in header,
profile page, per-user Firestore data protected by rules, guest data merged on sign-in.

### State management (1)

Global state uses **Redux Toolkit** (an approved library in the requirements).

| Global (Redux store)            | Local (`useState`)                        | URL                   |
| ------------------------------- | ----------------------------------------- | --------------------- |
| `auth`: user, status, error     | form values, open menus, selected episode | catalog filters, page |
| `library`: entries, sync status | calendar month, dialog state              | library filters       |
| `preferences`: theme, language  |                                           |                       |

Lists and plans are not in the store: only the page that shows them needs them, so they stay
in page-level hooks with Firestore subscriptions.

Custom hooks (≥ 3 required):

| Hook                                                                   | Kind                                            |
| ---------------------------------------------------------------------- | ----------------------------------------------- |
| `useDebouncedValue`                                                    | debounce                                        |
| `useFetch`                                                             | data fetching (TMDB)                            |
| `useFirestoreQuery`                                                    | data fetching (realtime Firestore subscription) |
| `useLibrary` (dispatches library thunks, reads memoized selectors)     | business logic                                  |
| `useLists`, `useList`                                                  | business logic                                  |
| `usePlanner`, `usePlan`                                                | business logic                                  |
| `useDashboardStats`                                                    | derived data (`useMemo`)                        |
| `useAuth`, `useOnlineStatus`, `useCatalogFilters`, `useEpisodeRatings` | misc                                            |

### PWA (0.5)

See 3.11.

### UI/UX & dashboard (1)

Responsive layout (exists), shared components (Button, cards, forms, skeletons, StatusMessage,
Toast), accessible forms (labels, `aria-invalid`, error text linked with `aria-describedby`),
dashboard from 3.8.

## 7. Defense preparation

Things to be ready to demonstrate and explain:

- **Workflow:** sign up → verify → add titles → create a list → share with a second account as
  editor → friend adds a title → create a plan → complete a session → see progress in library,
  profile and dashboard.
- **Security:** open a private list URL from another account → `permission-denied` from
  Firestore. Show the rules.
- **Race conditions:** type fast in search with network throttling; show aborted requests in
  DevTools.
- **Caching and invalidation:** service worker caches (Application tab), network-first vs
  cache-first, `skipWaiting` on update, Firestore offline writes syncing on reconnect.
- **PWA:** install the app, go offline, navigate cached pages, open the offline page, reconnect.
- **Architecture:** why state lives where it does (Redux vs local vs URL), services vs hooks,
  why TypeScript (discriminated unions in `useFetch`, typed slices).
