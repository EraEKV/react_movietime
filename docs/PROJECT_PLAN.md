# Movietime — End-Term Project Plan

This document describes the Movietime end-term project: the scope, the features, the order of
work, how every grading requirement is covered, and notes for the defense (section 7). All
planned phases are done and later work is merged: emails and web push, people and franchises,
shared movie marathons, the calendar feed, avatars, new dashboard charts and the move to
Cloudflare Workers with protection against bots (phases 17 to 27 in the roadmap).

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

- Firebase Authentication with **Email/Password** and **Google** (popup on desktop, redirect on phones and in the installed app).
- Signup validation: valid email, password ≥ 8 characters with at least one number and one
  special character, password confirmation, display name.
- After email signup a verification email is sent. Verification is required to receive shared
  access by email (see 3.6), because the security rules check `email_verified`.
- Session persists across reloads (Firebase default `browserLocalPersistence`).
- The `auth` slice in the Redux store holds `{ user, status, error }`. While Firebase restores the session, the
  app shows a loader instead of flashing the login page.
- `ProtectedRoute` redirects guests to `/login?redirect=<original path>`.
  `GuestRoute` redirects signed-in users away from `/login` and `/signup`.
- The header shows the avatar and a menu (Profile, Dashboard, Settings, Sign out).
  Unverified email accounts see a banner with "Resend email" and "I've verified".

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

- **Notification and invite link.** Adding a member writes an in-app notification in the same
  batch (bell in the header, unread counter, _Open_ / _Mark as read_ / _Decline_). The app does
  not check whether the email has an account (that would let anyone probe which emails are
  registered), so the notification waits for the verified email. For people outside the app the
  share dialog offers an invite link (`/signup?invite=…&email=…`; copy, Web Share, mailto) that
  leads through sign-up and email verification to the list or plan. The dialog can also email
  that link (Resend, see "Email" in docs/FIREBASE_SETUP.md); a member whose role changes gets
  an email too, and a new account gets a one-time welcome email.
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

`/dashboard` (public: guests see their local library, plans need an account), computed from the
user's real library and plans:

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
  sign out. Notification switches from the design stay out: there is no push.

| Profile requirement                   | How                                                                                                |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Profile / Favorites / Purchases page  | `/profile`: account info, library / lists / plans counters (links), recent activity                |
| ≥ 1 page only for authenticated users | `/profile/*` (also Lists, Planner) behind `ProtectedRoute`; guests go to `/login`                  |
| Theme bonus, synced with the account  | `users/{uid}.settings` + listener; account wins on sign-in, live on other devices                  |
| Form states                           | Display name 1–40: inline error, focus on it, `aria-invalid` + `aria-describedby`, Saving… / Saved |
| Activity                              | `users/{uid}/activity`, validated by rules, newest 20 live; skeleton / empty / retry               |
| Language                              | EN / RU / KZ; applies at once, saved in the account (phase 11 translated the UI)                   |

### 3.10 Bonus features

| Bonus    | Plan                                                                                                                                                                                                                                                                                                                                                                    |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Theme    | Light / dark / system. CSS custom properties under `[data-theme]`. Guests: `localStorage`, users: `users/{uid}.settings.theme`.                                                                                                                                                                                                                                         |
| i18n     | `react-i18next` with **en / ru / kk**. The language is also sent to TMDB (`language=ru-RU`), so overviews and titles are translated; it's part of every request key, so switching refetches. ✅ Dictionaries are split by feature and loaded on demand; plurals for ru; `Intl` for dates and numbers; English overview when TMDB has none; language menu in the header. |
| Sharing  | Link sharing + roles (3.6).                                                                                                                                                                                                                                                                                                                                             |
| Planner  | Calendar planner (3.7), `.ics` export.                                                                                                                                                                                                                                                                                                                                  |
| Firebase | Auth, Firestore, security rules, offline persistence.                                                                                                                                                                                                                                                                                                                   |

**Web push (done, not FCM).** A friend gets a Web Push message when something is shared with
them or their role changes, even when the app is closed. Each person turns it on in Settings →
Notifications. Subscriptions are in a collection no client can read; the Worker endpoints
`/api/push` (subscribe) and `/api/push-notify` (send) use Firebase Admin and a VAPID key pair.
Firebase Cloud Messaging and scheduled reminders ("your episode starts in 15 minutes") are not
built: they need a scheduler, which the free plan does not give. "Tonight" in the header and "Up
next" on Home and the dashboard cover that need.

**Email.** Invitations, role-change notices and a one-time welcome email are sent through Resend
from Worker endpoints (`api/send-*.ts`), after the endpoint checks the caller's Firebase token.

**Protection against bots and scrapers.** See [PROTECTION.md](PROTECTION.md).

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
- 527 tests in 75 files (also server handlers, the TMDB proxy allow-list and the edge cache). Firestore security rules were checked by hand-written scripts against
  the emulator (owner, editor, viewer, unverified member, stranger, guest), not by `npm test`.

## 4. Pages and routes

| Route                 | Page              | Access    | Lazy | Requirement                 |
| --------------------- | ----------------- | --------- | ---- | --------------------------- |
| `/`                   | `HomePage`        | public    |      | Home                        |
| `/about`              | `AboutPage`       | public    | ✓    | About                       |
| `/login`              | `LoginPage`       | guest     |      | Login                       |
| `/signup`             | `SignupPage`      | guest     |      | Signup                      |
| `/movies`, `/series`  | `CatalogPage`     | public    | ✓    | Items List                  |
| `/movies/:id`         | `MoviePage`       | public    | ✓    | Item Details                |
| `/series/:id`         | `SeriesPage`      | public    | ✓    | Item Details                |
| `/library`            | `LibraryPage`     | public    | ✓    | Favorites (guest + user)    |
| `/library/:key/edit`  | `LibraryEditPage` | public    | ✓    |                             |
| `/lists`              | `ListsPage`       | protected | ✓    | Secondary Entity Management |
| `/lists/new`          | `ListFormPage`    | protected |      |                             |
| `/lists/:listId`      | `ListPage`        | role/link |      | dynamic route               |
| `/lists/:listId/edit` | `ListFormPage`    | owner     |      |                             |
| `/planner`            | `PlannerPage`     | protected | ✓    | Business feature            |
| `/planner/new`        | `PlanCreatePage`  | protected |      |                             |
| `/planner/:planId`    | `PlanPage`        | role/link |      | dynamic route               |
| `/dashboard`          | `DashboardPage`   | public    | ✓    | Dashboard                   |
| `/profile`            | `ProfilePage`     | protected | ✓    | Profile                     |
| `/profile/settings`   | `SettingsPage`    | protected | ✓    | nested route                |
| `/offline`            | `OfflinePage`     | public    | ✓    | PWA                         |
| `*`                   | `NotFoundPage`    | public    |      | 404                         |

"role/link" pages are public routes: the page decides between owner, editor, viewer, and
"no access" from the document and the rules' answer.

## 5. Roadmap

Each phase is one feature branch and one PR (see [CONTRIBUTING.md](CONTRIBUTING.md)).
Small fixes between phases go straight to `main`.

| #   | Branch                                                                    | Scope                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0   | `main` ✅                                                                 | These docs and the README                                                                                                                                             |
| 0.5 | `refactor/typescript` ✅                                                  | Codebase migrated to TypeScript (strict), typed TMDB responses, `typescript-eslint`                                                                                   |
| 1   | `feat/ui-foundation` ✅                                                   | Design tokens (both themes), fonts, base UI components, header + mobile tab bar, Redux store with the `preferences` slice and theme listener, existing pages restyled |
| 2   | `feat/firebase-auth` ✅                                                   | `auth` slice, Firebase init, auth service, Login/Signup (email + Google), verification, protected/guest routes, user in header, profile document                      |
| 3   | `feat/routing` ✅                                                         | Home landing, About, catalog moved to `/series`, nested routes, lazy pages                                                                                            |
| 4   | `feat/movies` ✅                                                          | Movie catalog and details, shared media helpers, 5th filter, language filter, page size                                                                               |
| 5   | `feat/library` ✅                                                         | Watchlist → Library, Firestore sync, guest merge on sign-in                                                                                                           |
| 6   | `feat/lists` ✅                                                           | Lists CRUD and list items                                                                                                                                             |
| 7   | `feat/sharing` ✅                                                         | Link visibility, members and roles, "Shared with me", copy list, Firestore rules                                                                                      |
| 8   | `feat/planner` ✅                                                         | Schedule generation, calendar, complete / reschedule / skip, `.ics` export, plan sharing                                                                              |
| 9   | `feat/dashboard` ✅                                                       | Stats, breakdowns, filters and navigation                                                                                                                             |
| 10  | `feat/profile` ✅                                                         | Profile page, settings (theme, language, display name)                                                                                                                |
| 11  | `feat/i18n` ✅                                                            | en / ru / kk, lazy dictionaries per feature, plurals, `Intl` formats, TMDB language, header language menu                                                             |
| 12  | `feat/pwa` ✅                                                             | Manifest, service worker, caching, offline page, status indicator, update prompt                                                                                      |
| 13  | `feat/notifications` ✅                                                   | In-app notifications (bell, realtime), invite link (copy, Web Share, mailto), rules and index; web push stays out (see 3.10)                                          |
| 14  | `test/unit-and-component` ✅                                              | Vitest + Testing Library: logic, slices, hooks, components (see 3.12)                                                                                                 |
| 15  | `docs/final` ✅                                                           | Final README, screenshots, docs sync, defense notes                                                                                                                   |
| 16  | `feat/player` ✅                                                          | "Where to watch" from TMDB `/watch/providers` with the JustWatch credit; no streaming of our own (see 7.4)                                                            |
| 17  | `feat/web-push`, `feat/resend-emails` ✅                                  | Web Push on share and role change, invite / role / welcome emails through Resend, `FIREBASE_SERVICE_ACCOUNT` for the server                                           |
| 18  | `feat/people`, `feat/collections` ✅                                      | Person and franchise pages, TMDB aggregate credits, a marathon from a collection                                                                                      |
| 19  | `feat/planner-movies`, `feat/planner-preview`, `feat/planner-schedule` ✅ | One-film plans, editable preview (drag a session, leave a film out, reorder), own time per weekday, overlap warnings                                                  |
| 20  | `feat/calendar-feed` ✅                                                   | Secret `.ics` link with every session of your plans                                                                                                                   |
| 21  | `feat/shared-marathon` ✅                                                 | Likes and film suggestions on shared marathons, notices for them                                                                                                      |
| 22  | `feat/avatar` ✅                                                          | Emoji or cropped photo avatar stored in the profile                                                                                                                   |
| 23  | `feat/franchise-people`, `feat/movie-page` ✅                             | Continue a franchise, a director marathon, full crew, where to watch on plan rows                                                                                     |
| 24  | `fix/api-hardening` ✅                                                    | TMDB proxy allow-list, edge cache, capped bodies (see PROTECTION.md)                                                                                                  |
| 25  | `feat/dashboard-modern`, `feat/dashboard-charts-2` ✅                     | Recharts rings and graphs, animated tiles, month activity grid, hero with genre chips                                                                                 |
| 26  | `fix/google-auth-domain`, `fix/fewer-chunks` ✅                           | Google sign-in on our own domain, 230 → 66 build files, immutable static caching                                                                                      |
| 27  | `fix/design-audit-2` ✅                                                   | 44px touch targets, 4/8 spacing, weekday presets, finish line, catch-up banner, self-hosted fonts, compact phone header                                               |

## 6. Requirements checklist

### Deployment & routing (0.5)

| Requirement                              | How                                                                                                  |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Public HTTPS deployment                  | Cloudflare Workers: https://avleron.com                                                              |
| Everything works on the deployed version | Firebase is a hosted backend; our domain in Auth authorized domains, `/__/*` proxied                 |
| Nested routes, shared layout             | `Layout` → `Outlet`; `/lists/*`, `/planner/*`, `/profile/*`, `/library/*`                            |
| Dynamic routes                           | `/movies/:id`, `/series/:id`, `/person/:id`, `/collection/:id`, `/lists/:listId`, `/planner/:planId` |
| Lazy loading ≥ 3 pages                   | Every page except Home, auth and 404 (`React.lazy` in `App.tsx`)                                     |
| Custom 404                               | `NotFoundPage` (exists)                                                                              |
| ≥ 1 authenticated-only page              | Profile, Lists, Planner                                                                              |

### Architecture (0.5)

| Requirement                                    | How                                                                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| pages / components / hooks / services / styles | `src/pages`, `src/components`, `src/hooks`, `src/services`, `src/shared/styles`     |
| Logic outside components                       | Firestore and TMDB calls in `src/services` and `src/api`; pure logic in `src/utils` |
| No `localStorage` in UI components             | Only in `src/storage/*` modules                                                     |
| One page per file                              | `src/pages/*Page.tsx`                                                               |

### API & data (0.5)

| Requirement                                                | How                                                               |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| ≥ 3 related resources                                      | Titles (TMDB) → Library/Lists (Firestore) → Plans/Sessions        |
| ≥ 100 items                                                | TMDB: hundreds of thousands of movies and series                  |
| List with search, 5 filters, sort, paging via query params | `/discover/*`, `/search/*`                                        |
| Separate details endpoint, ≥ 7 fields                      | `/movie/:id`, `/tv/:id` (12+ fields)                              |
| Documented data models                                     | [DATA_MODEL.md](DATA_MODEL.md), TS types in `src/types`           |
| Loading / error / empty / invalid id                       | Skeletons, `ErrorState` with retry, empty states, not-found state |
| Stale responses                                            | `AbortController` + ignore flag in `useFetch`                     |

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
| `useSubscription`                                                      | data fetching (realtime Firestore subscription) |
| `useLibrary` (dispatches library thunks, reads memoized selectors)     | business logic                                  |
| `useMyLists`, `useSharedLists`, `useList`                              | business logic                                  |
| `usePlanner`, `usePlan`                                                | business logic                                  |
| `useDashboardStats`                                                    | derived data (`useMemo`)                        |
| `useAuth`, `useOnlineStatus`, `useCatalogFilters`, `useEpisodeRatings` | misc                                            |

### PWA (0.5)

See 3.11.

### UI/UX & dashboard (1)

Responsive layout (exists), shared components (Button, cards, forms, skeletons, EmptyState/ErrorState,
Toast), accessible forms (labels, `aria-invalid`, error text linked with `aria-describedby`),
dashboard from 3.8.

| Dashboard requirement                    | How                                                                                            |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| ≥ 4 calculated statistics from real data | 6 tiles: titles, completed (%), average score, hours watched, sessions this week, active plans |
| ≥ 2 data breakdowns                      | 4: titles by status, top genres, movies vs series, sessions by weekday                         |
| Interactive filtering                    | Period All time / 30 days / This year in `?period=`, re-derived without refetching             |
| Navigation to records                    | Tiles and bars → `/library?status=` / `?genre=` / `?type=`; upcoming sessions → `/planner/:id` |
| States                                   | Skeleton tiles, empty state for new users, error + retry per card, guest banner                |
| Memoization                              | `createSelector` (library half) + `useMemo` (genres, plan figures) in `useDashboardStats`      |

## 7. Defense preparation

Production: https://avleron.com. Two accounts help: A (owner) and B (friend), both
with verified emails, in two browser profiles or one normal and one private window.

### 7.1 Demo script (about 7 minutes)

1. **Catalog.** `/series`: type in the search box and show that the URL changes (`?q=`), set a
   genre and a rating, change the page size to 40, reload and go back: nothing is lost. DevTools →
   Network: a fast-typed query sends one request, older ones show as cancelled.
2. **Details.** Open a series: seasons, trailer, cast and the **episode ratings heatmap** (click
   an episode for its panel). Open a movie for the other details layout.
3. **Auth.** Sign up as A (validation messages), verify the email, sign in. Show the persistent
   session (reload) and that `/profile` redirects guests to `/login` and back after signing in.
4. **Library.** Add titles from the catalog and a title page, set a status and a score, undo a
   removal. Open the library in a private window as a guest: it is local; sign in and the
   guest titles merge into the account.
5. **Lists + sharing.** Create a list, add titles through the search picker, add B by email as
   **editor**. As B, "Shared with me" shows it; B adds a title. Change B to **viewer**: B can't
   edit any more. Open the list URL from an account that isn't a member: `permission-denied`
   from Firestore, shown as a "no access" screen. Show `firestore.rules`.
6. **Planner.** Create a plan from a series (weekdays, time, pace) and look at the preview, then
   confirm. Calendar, "Today", **mark a session as watched**, reschedule one with "shift later
   sessions", export `.ics`. Try the weekday presets and the finish line on the schedule step,
   and drag a session to another day in the preview. Move a plan's sessions into the past to see
   the "continue from today" banner.
7. **Everything connected.** After marking the session: library progress moved, the activity feed
   on `/profile` has a new record, `/dashboard` numbers changed (hours, sessions this week); click a
   bar and the library opens with that filter.
8. **Language and theme.** Switch EN → RU → KZ in the header: no reload, TMDB texts change.
   Toggle the theme.
9. **PWA.** See 7.3.

### 7.2 Architecture in two minutes

- `src/shared` holds everything without business meaning (UI kit, generic hooks, helpers, the
  TMDB client, i18n, styles) and may not import from the rest of `src` (ESLint rule). The rest
  is split by kind: `pages` (one per route) and `components` render; `hooks` connect React to
  data; `services` talk to Firebase; `storage` is the only code that touches `localStorage`;
  `utils` holds pure domain logic with the unit tests.
- **State:** Redux Toolkit for what the whole app needs (`auth`, `library`, `preferences`) with
  listener middleware for side effects; the URL for what must be shareable (catalog and library
  filters); `useState` for local UI. Lists and plans stay in page-level hooks with Firestore
  listeners, because only one page shows them. Derived data (stats, filtered library) is
  computed with selectors or `useMemo`, never stored.
- **Data:** TMDB is read-only and fetched with `fetch` in `useFetch`/`useRequest`; user data is in
  Firestore (`users/{uid}/library`, `lists`, `plans` with sub-collections). A title snapshot is
  saved with each library entry, so lists render without TMDB requests.
- **Security:** roles live on the document and are enforced by Firestore rules, not by the UI;
  member access needs a verified email.
- **Bundle:** pages are lazy; Firebase Auth is in the main chunk, the Firestore SDK is loaded on
  demand; dictionaries load per feature. First-load JS is about 440 kB.

### 7.3 Caching, invalidation, PWA and offline

- **Layers:** Workbox precache for the app shell, JS, CSS, icons and dictionaries; TMDB API
  network-first (5 s timeout, 1 day); TMDB images cache-first (300 entries, 30 days); fonts
  stale-while-revalidate and cache-first; Firestore persistent cache for user data;
  `localStorage` for the guest library and preferences. Details:
  [ARCHITECTURE.md → Caching and invalidation](ARCHITECTURE.md#caching-and-invalidation-as-implemented).
- **Invalidation:** precache entries are revisioned by the build and old ones are deleted on
  activate. A new service worker waits until the user presses "Reload" in the update toast
  (`SKIP_WAITING`), so a page is never swapped under the user. TMDB responses expire after a day.
  Firestore listeners keep the cache current by themselves.
- **Demo:** DevTools → Application: manifest and "installable", service worker status, the cache
  list. Install the app (address bar icon). Network → Offline, then reload: the app opens, visited
  pages work, an offline pill appears in the header, library and lists come from the Firestore cache.
  Make a change offline, go back online: it syncs. Open a route that has nothing cached: `/offline`.
- **Not verified in a browser:** the update prompt itself (it needs two consecutive builds).

### 7.4 Likely questions

| Question                                               | Short answer                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Why Redux Toolkit and not only Context?                | Auth, library and preferences are read on many routes and change from listeners (Firestore snapshots, other tabs). Slices, selectors and listener middleware give one place for that logic and easy tests. Context would re-render consumers and mix data with side effects.                                                                              |
| Why are lists and plans not in the store?              | Only the page that shows them needs them, and `onSnapshot` already keeps them live. A copy in Redux would be a second source of truth.                                                                                                                                                                                                                    |
| How do you avoid race conditions?                      | Each request effect aborts the previous request in its cleanup (`AbortController`) and ignores late results with a flag; search is also debounced (400 ms). `useFetch` has a test for exactly this.                                                                                                                                                       |
| Why a custom `useFetch` and not React Query?           | The requirements ask for custom data-fetching hooks. The cost is no shared cache between components, which the service worker (network-first) and the small number of requests make acceptable.                                                                                                                                                           |
| Where is the access control?                           | In `firestore.rules`: `canRead`, `isOwner`, `isEditor`, `isMember` helpers per document, plus field validators. The UI only hides buttons; calling the API directly still gets `permission-denied`.                                                                                                                                                       |
| Can anyone list public lists?                          | No. A link visitor can read one document by id; `list` queries need ownership or membership.                                                                                                                                                                                                                                                              |
| What happens to a guest's data on sign-in?             | The local library is merged into the account in one batch (account entries win), then local storage is cleared.                                                                                                                                                                                                                                           |
| How does the planner build a schedule?                 | `buildSchedule(episodes, options)` is a pure function: it drops specials and unaired episodes, groups episodes into sessions by pace and puts each on the next chosen weekday. It has unit tests under two time zones.                                                                                                                                    |
| Why `injectManifest` and not `generateSW`?             | Every caching rule is visible in our own `src/sw.ts`; the plugin only injects the precache list and the manifest.                                                                                                                                                                                                                                         |
| What works offline?                                    | The shell, visited and lazy pages, cached TMDB responses and posters, the library and lists from the Firestore cache. New TMDB searches don't work offline and show an error with a retry button.                                                                                                                                                         |
| Why TypeScript 6 and not 7?                            | `typescript-eslint` 8 doesn't support TS 7 yet.                                                                                                                                                                                                                                                                                                           |
| What is not done?                                      | Scheduled reminders (Web Push is sent only on a share or a role change), UI check of the update prompt. Stored data keeps the language it was created in; Kazakh TMDB overviews often fall back to English.                                                                                                                                               |
| Why not send the invitation by email?                  | It does, through Resend from a Worker endpoint that checks the caller's token and sends only to members of a list or plan the caller owns. The owner can also copy the link, use the phone's share sheet or a prefilled mail, and people who already use the app get a bell notification and a push.                                                      |
| Why doesn't the app check if the email has an account? | Answering "this email is registered" is an email-enumeration leak, and profiles are private. The notification is keyed by email and waits; the rules show it only to the verified owner of that email.                                                                                                                                                    |
| How can an owner not spam strangers?                   | The rules accept a notification only in the same batch that adds that email as a member of the owner's own list or plan, at most 20 members, and never twice for the same member.                                                                                                                                                                         |
| Why doesn't the app play movies?                       | Streams need licences. "Where to watch" shows where a title is officially offered in the viewer's country (TMDB `/watch/providers`, data by JustWatch, credited next to it) and plays nothing itself, so the project has no copyright exposure.                                                                                                           |
| How do you test?                                       | `npm test`: 527 unit and component tests in 75 files (logic, slices, hooks, server handlers, components). Rules and UI flows were verified against the emulator and a mocked TMDB with scripts that aren't part of the repo.                                                                                                                              |
| How is the site protected from bots and scrapers?      | The TMDB proxy answers only the requests the app makes and caches them at the edge; mail, push and the calendar feed need a Firebase token or a secret; Firestore rules guard user data; static files are cached for a year and do not run code; Cloudflare rules rate-limit `/api/*` and challenge page navigations. See [PROTECTION.md](PROTECTION.md). |

## Layered structure (FSD-like): `shared/` done, the rest is an idea

Done in `refactor/structure`: step 1 below. `src/shared` holds the UI kit, generic hooks,
domain-free helpers, the TMDB client, i18n, styles and app-wide types, and an ESLint rule keeps
it from importing the rest of `src`. Files were only moved (`git diff -M` shows renames);
first-load JS stayed the same. Full FSD looks too heavy for an app this size, so steps 2–3 are
not planned; the target below stays as a reference.

Kept outside `shared/` on purpose: `utils/calendar.ts` and `DatePicker` (they use the planner's
`Weekday` type), `CalendarMonth`, `ProgressRing`, `WeekdayToggle`, `ScorePicker` (planner and
library types), `useTheme` (reads the Redux store).

Reference target:

```
src/
├── app/        providers, router, store setup, global styles       (imports everything below)
├── pages/      one file per route: composition only
├── widgets/    big self-contained blocks: Header, TabBar, PlannerCalendar, ShareDialog…
├── features/   one user action each: add-to-library, share-list, create-plan, change-language…
├── entities/   what the app is about: media, library-entry, list, plan, user
│               (types + service + small UI such as PosterCard, RoleBadge)
└── shared/     no business meaning: ui/ (Button, Dialog, Menu…), lib/ (format, calendar,
                cx), api/ (tmdb, firebase), i18n/, hooks/ (useMediaQuery, useRequest), config/
```

Rules: a layer imports only from layers below it; a slice (a folder in `features/`, `entities/`…)
exposes a public `index.ts` and nobody reaches into its files; slices of one layer don't import
each other. Not every slice needs every segment (`ui/`, `model/`, `api/`, `lib/`): add folders
when there is a file for them, so there is no folder for the sake of a folder.

Order of work, each step one PR that moves files and changes imports only:

1. `shared/`: UI kit, generic hooks, `utils/` helpers without domain meaning, `api/tmdb`,
   `i18n/`, styles. Biggest win, lowest risk.
2. `entities/`: types, services and small views of media, library, list, plan, user.
3. `features/` and `widgets/`: split the large pages (`PlanPage`, `ListPage`, `DashboardPage`).
4. Enforce the direction of imports with an ESLint rule (`no-restricted-imports` per layer);
   done for `shared/`.

Dictionaries stay in `public/locales/`; the namespace per feature already matches the future
`features/` and `entities/` slices.
