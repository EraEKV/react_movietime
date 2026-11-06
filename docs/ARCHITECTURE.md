# Architecture

This document has two parts:

1. **[Target architecture](#target-architecture-end-term)**: how the app is organized once
   the end-term features from [PROJECT_PLAN.md](PROJECT_PLAN.md) are in.
2. **[Current implementation](#current-implementation-midterm)**: how the existing code
   works (catalog, title pages, heatmap, library) and which React patterns it uses. It
   stays valid as the base the end-term builds on.

## Target architecture (end-term)

### Folder structure

```
src/
├── api/            tmdb.ts: TMDB client, endpoint builders, ApiError
├── services/       firebase.ts, authService, profileService, libraryService,
│                   listsService, sharingService, plannerService
├── storage/        localStorage modules (guest library, preferences)
├── store/          store.ts, hooks.ts (typed useAppDispatch / useAppSelector),
│                   authSlice, librarySlice, preferencesSlice, listeners.ts
├── types/          TMDB responses, Firestore documents, shared types
├── hooks/          useFetch, useSubscription, useAuth, useLibrary, useLists, usePlanner,
│                   useDashboardStats, useDebouncedValue, useOnlineStatus, …
├── components/     reusable UI, one folder per component + CSS Module
│   ├── auth/       ProtectedRoute, GuestRoute, UserMenu, GoogleButton
│   ├── form/       TextField, PasswordField, SelectField, FormError
│   └── …
├── pages/          one file per route
├── i18n/           i18next setup + en / ru / kk resources
├── styles/         global.css, design tokens, themes
├── sw.ts           service worker (Workbox)
└── utils/          pure functions: media, filters, schedule, stats, validation, firebaseErrors
```

Rule of thumb: **pages and components render and handle events; hooks connect React state to
services; services talk to the network or storage; utils are pure and know nothing about
React.**

### Design system and styles

- **Tokens** (`styles/tokens.css`): every colour and shadow has a dark and a light value under
  `[data-theme='dark']` / `[data-theme='light']`; spacing (`--space-1…16`, 4/8 scale), radius,
  layout and z-index tokens are theme-independent. Dark is the default.
- **Theme switch = one attribute.** `<html data-theme>` swaps every colour at once; components
  only ever write `var(--token)`, never a hex value. An inline script in `index.html` applies the
  saved theme before the first paint, so there is no flash of the wrong theme.
- `styles/global.css`: motion (`--dur-fast/base/slow`, `--ease-out`, zeroed under
  `prefers-reduced-motion`), `prefers-contrast: more`, base element styles, the focus ring.
- `styles/typography.module.css`: the type scale (Unbounded for display text, Onest for UI);
  component modules reuse it with `composes:`.
- Base components (`Button`, `IconButton`, `ButtonLink`, `TextField`, `Textarea`, `SelectField`,
  `Chip`, `Tabs`, `SegmentedControl`, `Card`, `PosterCard`, `RatingBadge`, `Skeleton`,
  `EmptyState`, `ErrorState`, `Banner`, `Toast`, `Dialog`/`BottomSheet`, …) each live in their
  own folder with a CSS Module. Dialogs use the native `<dialog>` element (`showModal()` gives
  the focus trap, Esc and the top layer).
- Layout: ≥ 1024px a sticky header with the main nav; below, a compact header and a bottom tab
  bar. Skip link to `#main`, TMDB attribution in the footer.

### Global state: Redux Toolkit

```
<Provider store={store}>
└── <BrowserRouter>
    └── <App>                       routes
```

| Slice         | State                                           | Written by                                              |
| ------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `auth`        | `user` (serializable subset), `status`, `error` | auth listener, sign-in / sign-out thunks                |
| `library`     | entries by media key, `status`, `error`         | Firestore snapshot listener, guest storage, CRUD thunks |
| `preferences` | `theme`, `language`, `systemTheme`              | header toggle, settings page, `matchMedia` listener     |

- **Side effects live outside components** in RTK **listener middleware** (`store/listeners.ts`):
  - `onIdTokenChanged` → `auth/changed`;
  - on `auth/changed`, start or stop the Firestore subscription of the library (and merge the
    guest library on the first sign-in);
  - on `preferences/*` changes, save to `localStorage` (guests) or the profile (users) and set
    `data-theme` on `<html>`.
- **Only serializable data goes into the store.** Firebase `User` objects and Firestore
  `Timestamp`s are converted in the service layer (ISO strings, plain objects).
- Components use the typed hooks `useAppSelector` / `useAppDispatch`, wrapped in feature hooks
  (`useAuth`, `useLibrary`, `useTheme`) so pages don't depend on the store's shape.
- **Memoized selectors** (`createSelector`) derive filtered lists and dashboard statistics.
- Until Firebase reports the first auth state, `auth.status` is `"loading"` and protected
  routes render a loader instead of redirecting.
- Lists and plans are **not** in the store: each page subscribes to what it shows through
  `useMyLists` / `useList` / `usePlan`, built on `useSubscription` (cleanup unsubscribes, a
  listener that resolves after unmount is closed at once, "loading" is derived from the key).

### Routing

```
<Route element={<AuthLayout />}>      split screen without the app header
  <Route element={<GuestRoute />}>      login, signup (signup → verify-email for new accounts)
  <Route element={<ProtectedRoute />}>  verify-email
<Route element={<Layout />}>
  index                         HomePage             (main bundle: the first screen)
  about                         AboutPage            (lazy)
  movies, series                CatalogPage          (lazy)
  movies/:id                    MoviePage            (lazy)
  series/:id                    SeriesPage           (lazy)
  library                       LibraryPage          (lazy)
  library/:mediaKey/edit        LibraryEditPage      (lazy)
  watchlist/*                   → redirect to /library (midterm links)
  lists/:id                     ListPage             (lazy; public: owner / editor / viewer / link visitor)
  planner/:id                   PlanPage             (lazy; public: owner / editor / viewer / link visitor)
  <Route element={<ProtectedRoute />}>
    lists                       ListsPage            (lazy; My lists + Shared with me)
    lists/new, lists/:id/edit   ListFormPage         (lazy, edit = owner only)
    planner                     PlannerPage          (lazy)
    planner/new                 CreatePlanPage       (lazy; ?series=ID or ?list=ID preselects)
    dashboard                   DashboardPage        (lazy)
    profile                     ProfileLayout        (lazy) → index: ProfilePage, settings: ProfileSettingsPage
  offline                       OfflinePage          (lazy)
  *                             NotFoundPage
```

Lazy pages are wrapped in one `<Suspense fallback={<PageLoader />}>` inside `Layout`, so the
header stays visible while a chunk loads. React Router runs navigations in a transition, so after
the first load a page switch keeps the old page on screen until the new chunk is ready.

### Sharing and roles in the UI

`/lists/:id` is outside `ProtectedRoute`, so a shared link opens for guests. The page doesn't
decide access: it opens the list document, and if the rules refuse, it shows the same 404 as
for a missing list (plus a hint to sign in or verify the email). When the read succeeds,
`roleOf(list, user)` (utils/sharing) picks the actions, mirroring the rules:

| Role         | Actions on the page                                         |
| ------------ | ----------------------------------------------------------- |
| owner        | Add titles, Share (ShareDialog), Edit, Delete               |
| editor       | Add titles, item notes / remove, Leave list                 |
| viewer       | Read-only Banner, Leave list                                |
| link visitor | Banner; _Copy to my lists_ (signed in) or _Sign in to copy_ |

`useList` waits for the session to be restored and keys its listener by user + verification,
so a member never sees a false "not found" while auth loads, and the listener reopens with new
credentials after sign-in or email verification. `ListPage` renders `<ListView key={id}>`, so
navigating to a fresh copy starts with fresh state. `ShareDialog` only talks through callbacks
(`useSharing`), and `PlanPage` reuses it for plans.

### Planner

- `usePlans` merges two listeners (my plans, plans shared with my verified email).
  `usePlanner(month)` adds one sessions listener per plan for the visible month grid and one for
  today; the key holds only plan ids and the range, so a counter change doesn't reopen them, and
  sessions are joined with the latest plan objects in `useMemo`.
- The stepper keeps all choices in state and derives everything else on render
  (`buildSchedule` → `planSummary`), so the live preview can't go stale.
- The calendar switches with `useMediaQuery`: month grid with posters ≥ 1024 px, dot chips
  768–1023 px, an agenda by day below. Month and filter live in the URL (`?month=2026-11&show=mine`).
- Session actions are awaited batches; the snapshot updates the page, failures come back as a
  toast. Skip has no confirm dialog because it can be undone (toast and row).
- Home "Up next" and the header "Tonight" chip are lazy components (`useUpcoming`), so the
  planner hooks and Firestore never load for guests.

### Code splitting

| Chunk                   | Size (min) | Loaded                                                                  |
| ----------------------- | ---------- | ----------------------------------------------------------------------- |
| `index` (main)          | ~385 kB    | Always: React, Redux (incl. library slice), Firebase Auth, layout, Home |
| shared vendor chunk     | ~40 kB     | Always (preloaded); code that lazy pages share with main (react-redux…) |
| `router`                | ~47 kB     | Always; own group in `vite.config.ts`, cached across deploys            |
| One chunk per lazy page | 1–15 kB    | First visit to that route                                               |
| Firestore SDK           | ~545 kB    | Lazy pages that read data, and the profile sync after sign-in           |

Firebase Auth is needed on every page (header, route guards), Firestore is not. So
`services/firebase.ts` creates only the app and `auth`, `services/firestore.ts` creates `db`,
and the sign-in thunks load the profile service with `await import(...)`. Before this split the
whole app was one 1 019 kB chunk. `build.chunkSizeWarningLimit` is 600 because the only chunk
above 500 kB is the lazily loaded Firestore SDK: cutting it with Rolldown `codeSplitting` groups
builds, but breaks the SDK's module init order at runtime. First-load JS (main + preloaded
chunks) is ~481 kB (Home's "Shared with you", "Up next" list and the header "Tonight" chip are
their own lazy chunks; the planner service is ~9 kB lazy); the bundler names the shared chunk after one of its modules, so its file name
(`firebaseErrors-*.js`) says little about its content.

### State map

| State                                     | Where                            | Why                                           |
| ----------------------------------------- | -------------------------------- | --------------------------------------------- |
| Signed-in user, profile, auth status      | Redux `auth` slice               | Needed by the header, routes and services     |
| Theme, language                           | Redux `preferences` slice        | Affects the whole tree and every TMDB request |
| Library entries                           | Redux `library` slice            | Used on many routes                           |
| Lists, list items, plans, sessions        | Page-level hooks (`onSnapshot`)  | Only the current page needs them              |
| Catalog search, filters, sort, page, size | URL (`useCatalogFilters`)        | Shareable, survives refresh and back/forward  |
| Library filters                           | URL                              | Dashboard links to filtered library           |
| Calendar month, dialogs, form values      | `useState` in the page/component | Local UI state                                |
| Dashboard numbers                         | `createSelector` / `useMemo`     | Derived; never stored                         |

### Realtime data

Firestore reads use `onSnapshot` through `useFirestoreQuery(subscribe, deps)`: the hook calls
a `watch*` function from a service in an effect and returns the unsubscribe function as
cleanup. The same `{ status, data, error }` shape as `useFetch` keeps pages consistent. With the
persistent cache, snapshots come from IndexedDB first (instantly and offline), then from the
server.

Writes are optimistic by nature: the local cache fires the snapshot immediately, and the server
confirms later. A failed write (for example `permission-denied`) is shown as an error toast.

### Caching layers

| Layer                      | What                            | Strategy / invalidation                            |
| -------------------------- | ------------------------------- | -------------------------------------------------- |
| Service worker precache    | App shell, JS/CSS chunks, icons | Versioned by the build; new SW activates on update |
| Service worker runtime     | TMDB API responses              | Network-first, fallback to cache offline           |
| Service worker runtime     | TMDB images                     | Cache-first, max entries + max age                 |
| Firestore persistent cache | User data                       | Kept in sync by snapshots; offline writes queued   |
| `localStorage`             | Guest library, preferences      | Written on change                                  |

## Current implementation

Phases 0–8 are in place (library, lists, sharing, planner). Dashboard and settings routes exist
and show a "Coming soon" placeholder until their phase lands, so the navigation never leads to a 404.

### Routes and render tree

| Route                     | Page                       | Purpose                                                     |
| ------------------------- | -------------------------- | ----------------------------------------------------------- |
| `/`                       | `HomePage`                 | Guest hero or "Up next", trending rows, heatmap teaser      |
| `/about`                  | `AboutPage`                | Features and TMDB credit                                    |
| `/movies`, `/series`      | `CatalogPage mediaType`    | Discover + search, 5 filters, sort, pagination, page size   |
| `/movies/:id`             | `MoviePage`                | Movie details, key facts, trailer, cast, recommendations    |
| `/series/:id`             | `SeriesPage`               | Series details and episode heatmap                          |
| `/library`                | `LibraryPage`              | Status tabs, search, type/genre/sort in the URL, rows/grid  |
| `/library/:mediaKey/edit` | `LibraryEditPage`          | Status, score, series progress, notes; remove with confirm  |
| `/profile`                | `ProfileLayout` → children | Nested: `ProfilePage` (index), settings placeholder         |
| `/offline`                | `OfflinePage`              | Offline screen (the service worker will serve it, phase 12) |
| `*`                       | `NotFoundPage`             | 404                                                         |

```
<BrowserRouter>
└── <App>
    └── <Layout>                            header, nav, footer, <Suspense> around <Outlet>, <LibraryNotice>
            ├── <HomePage>
            │   ├── <HomeHero> (guests) | <UpNextSection>, <ContinueWatching> (users)
            │   ├── <TrendingSection> → <SegmentedControl>, <PosterRow> → <PosterCard>
            │   └── <HeatmapTeaser> → <HeatmapGrid> (inert preview)
            ├── <CatalogPage key={mediaType} mediaType>   /movies and /series
            │   ├── <SegmentedControl>      Movies ⇄ Series (keeps shared params)
            │   ├── <SearchBar>
            │   ├── <FilterBar> → <SelectField> ×6, <FilterChip>, <BottomSheet> (mobile)
            │   ├── <SkeletonGrid> | <ErrorState> | <EmptyState> | <MediaGrid> → <PosterCard>
            │   └── <Pagination pageSize>
            ├── <MoviePage>
            │   └── <MovieDetails key={id}>
            │       ├── <TitleHero actions={<LibraryButton>}>
            │       ├── <FactTiles>         director, budget, revenue, runtime
            │       ├── <Trailer>, <CastList>
            │       └── <MediaGrid layout="row">   recommendations
            ├── <SeriesPage>
            │   └── <SeriesDetails key={id}>
            │       ├── <TitleHero actions={<LibraryButton>}>
            │       ├── <EpisodeHeatmap> → <HeatmapGrid>, <EpisodePanel>
            │       ├── <SeasonList>, <Trailer>, <CastList>
            │       └── <MediaGrid layout="row">   recommendations (same component as the catalog)
            ├── <LibraryPage> → <Banner> (guest), <Tabs>, <SelectField>, <LibraryItem> | <LibraryGrid>, <Pagination>, <Toast>
            └── <LibraryEditPage> → <LibraryEntryForm key={entry.key}> → <RadioCards>, <ScorePicker>, <Textarea>, <Dialog>
```

### Where state lives and why

| State                                    | Where                                                | Why                                                                                |
| ---------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Catalog filters, sort, page, size, query | URL search params (`useCatalogFilters`)              | Shareable links, refresh keeps them, back/forward walks through them               |
| Text typed in the search box             | `useState` in `SearchBar`                            | Changes on every keystroke; only the debounced value is committed to the URL       |
| API responses + request status           | `useState` inside `useRequest` / `useEpisodeRatings` | Each component that needs data owns its request                                    |
| Library entries                          | Redux `library` slice (normalized by media key)      | Title pages, library pages and Home all read it; guest or Firestore behind one API |
| Library search, tab, type, genre, sort   | URL search params (`useLibraryFilters`)              | Refresh and links keep them; the dashboard will link to a filtered library         |
| Edit form values, "submitted" flag       | `useState` in `LibraryEntryForm`                     | Local to the form until Save                                                       |
| Undo toast                               | `useTimedState` in the page / `LibraryButton`        | Pure UI state that clears itself                                                   |
| Selected episode in the heatmap          | `useState` in `EpisodeHeatmap` (id only)             | The episode object is derived from loaded data, so it can't go stale               |
| Trailer playing                          | `useState` in `Trailer`                              | Pure UI state, reset per series by `key`                                           |

Things that can be computed are **not** stored: filtered/sorted library (memoized selector), counts, total pages,
validation errors, `loading` status, best/worst episode, season averages.

### How API data reaches the UI

```
CatalogPage (mediaType from the route)
  URL ──► useCatalogFilters(mediaType) ──► { filters, query, page, size }
                                                │
  useCatalog ──► tmdbPagesFor(page, size)   e.g. size 40, page 3 → TMDB pages 5, 6
             ──► catalogPath(mediaType, filters, query, tmdbPage) per TMDB page
             ──► key = paths.join('\n')
                    │
  useRequest(key, load)
    └─ useEffect([key, attempt]) → tmdbGetAll(paths, { signal }) → mergeCatalogPages()
  { status, data: { items, totalPages, totalResults }, error, reload }
        │
        ├─ loading → <SkeletonGrid count={size}>
        ├─ error   → <ErrorState> + "Try again" (reload); filters stay in the URL
        ├─ empty   → <EmptyState> with a context-specific action
        └─ success → <MediaGrid items={data.items}> → <PosterCard> (props)
```

`MediaSummary` (`types/media.ts`) is the one shape cards and grids get: `fromMovie` and
`fromSeries` (`utils/media.ts`) map TMDB's `title`/`release_date` and
`name`/`first_air_date` into it.

The data isn't shown as-is. Genre ids are turned into names, unaired episodes are marked as
"not rated" instead of 0, season averages and best/worst episodes are computed, trailers are
picked by priority, specials are moved to the end, and a snapshot of each title (title, poster,
year, genres, runtime, episode count) is saved with its library entry, so the library renders
without TMDB requests.

### Library: one API, two backends

```
component ──► useLibrary().update(key, changes) ──► updateLibraryEntry thunk
                                                      │
              guest:  guestEntrySaved ──► reducer ──► listener ──► localStorage
              signed in: libraryService.updateEntry ──► Firestore local cache
                                                      └─► onSnapshot ──► accountLibrarySynced ──► reducer
```

- The listener in `store/libraryListeners.ts` reacts to the user changing (first auth result,
  sign-in, sign-out, another account). It cancels the previous run (`cancelActiveListeners`),
  merges a guest library into the account on first sign-in (batched, account entries win),
  subscribes with `onSnapshot`, and unsubscribes in `finally` when the next run cancels it.
- Writes for signed-in users are not awaited: the persistent cache fires the snapshot at once
  (also offline), and a rejected write (e.g. `permission-denied`) becomes an error toast.
- While the account library loads, title pages show a disabled library button: "Add" could
  otherwise overwrite an entry with a score and notes.
- Firestore rules validate every entry (known fields, status, score 1–10, notes ≤ 500, and the
  document id equals `mediaType_tmdbId`).

### React concepts in the code

#### Effects, dependencies and cleanup

| Effect                                  | Dependencies                      | Cleanup                                |
| --------------------------------------- | --------------------------------- | -------------------------------------- |
| `useRequest`: run a keyed loader        | `[key, attempt]`                  | `controller.abort()` + `ignore = true` |
| `useEpisodeRatings`: load all seasons   | `[seriesId, seasonsKey, attempt]` | aborts every batch with one controller |
| `SearchBar`: debounce commit to the URL | `[value, query]`                  | `clearTimeout`                         |
| `useDebouncedValue`                     | `[value, delay]`                  | `clearTimeout`                         |
| `useTimedState`: hide the undo toast    | `[value, ms]`                     | `clearTimeout`                         |
| `LibraryNotice`: hide the sync toast    | `[notice, dispatch]`              | `clearTimeout`                         |
| `Layout`: scroll to top on route change | `[pathname]`                      | none needed                            |

- **Stable dependencies.** Effects depend on strings, not on objects or arrays created during
  render. `useFetch` gets a path string; `useCatalog` joins its TMDB paths into one key, and
  `useRequest` reads the loader through `useEffectEvent`, so a new function each render doesn't
  restart the request. `useEpisodeRatings` turns the season list into
  `seasonNumbers.join(',')`, because a new array every render would re-run the effect forever.
- **No synchronous `setState` in effects.** `loading` isn't stored. Each result is saved together
  with the request key it belongs to, and if that key doesn't match the current request, the
  request is still loading.
- **Stale closures.** The debounce timer in `SearchBar` calls `onSearch` through
  `useEffectEvent`, so it always uses the latest callback without making it a dependency.

#### Race conditions

Typing "breaking bad" quickly, or clicking through pages fast, starts requests that can finish
out of order. Every request effect:

1. aborts the previous request through `AbortController` in its cleanup, and
2. sets an `ignore` flag, so a late response is dropped even if it slipped past the abort.

Combined with the 400ms debounce, a fast-typed query sends one request, and the UI always shows
the results for the current query.

#### Keys, identity and resetting state

- List keys are stable ids: TMDB `id` for series, `credit_id` for cast (one actor can play
  several roles), the media key (`tv_1396`) for library entries. Indexes are only used where the
  position _is_ the identity (skeleton placeholders, heatmap rows "episode N").
- `<CatalogPage key={mediaType}>`: /movies and /series render the same component in the same
  place; the key makes Movies ⇄ Series mount a fresh page (search input, sheet state).
- `<SeriesDetails key={id}>`, `<MovieDetails key={id}>`: going to a recommended title would otherwise reuse
  the component and keep its state, for example a trailer still playing. The key makes React mount
  a fresh instance.
- `<LibraryEntryForm key={entry.key}>`: the form copies the entry into state only on mount, so
  another entry gets its own instance instead of stale values.
- `SearchBar` updates its input during render when the URL query changes from outside (back
  button, clear). This follows React's "adjusting state when a prop changes" pattern instead of
  an effect.

#### Events, forms and immutable updates

- Controlled inputs everywhere: search, selects, radio group, textarea, autocomplete.
- Several setters in one handler (`setSearch` + `setPage(1)`) are batched into one re-render.
- Immutable updates: `[entry, ...prev]`, `prev.map(...)`, `prev.filter(...)`,
  `[...prev.slice(0, i), entry, ...prev.slice(i)]`, and `new URLSearchParams(prev)` for the URL.
- No direct DOM manipulation. The page `<title>` is rendered as JSX (React 19 hoists it into
  `<head>`). `window.scrollTo` and the `storage` listener are calls to browser APIs from effects
  and handlers.

### TMDB limitations and how they are handled

| Limitation                                                   | Handling                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `/search/*` can't filter by genre/rating/language or sort    | Search mode disables those controls and explains why. Year still works |
| A page is always 20 titles                                   | Size 40/60 loads 2/3 TMDB pages in parallel; repeats are dropped       |
| Budget, revenue, runtime are `0` when unknown                | Shown as "Unknown", not as $0                                          |
| `total_pages` can be 1000+, but pages above 500 return 400   | Pages are capped at 500, also when they come from the URL              |
| "Top rated" is dominated by shows with one 10/10 vote        | Rating sort and the rating filter require a minimum number of votes    |
| Discover "newest" includes announced shows dated years ahead | Newest sort is capped at today                                         |
| `append_to_response` accepts at most 20 sub-requests         | Seasons are split into batches of 20 and loaded with `Promise.all`     |
| Unaired episodes have rating `0`                             | Shown as "not rated", not as a bad score                               |
