# Architecture

This document has two parts:

1. **[Target architecture](#target-architecture-end-term)**: how the app is organized once
   the end-term features from [PROJECT_PLAN.md](PROJECT_PLAN.md) are in.
2. **[Current implementation](#current-implementation-midterm)**: how the existing code
   works (catalog, series page, heatmap, watchlist) and which React patterns it uses. It
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
├── hooks/          useFetch, useFirestoreQuery, useAuth, useLibrary, useLists, usePlanner,
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
  `useList` / `usePlan`.

### Routing

```
<Route element={<AuthLayout />}>      split screen without the app header
  <Route element={<GuestRoute />}>      login, signup (signup → verify-email for new accounts)
  <Route element={<ProtectedRoute />}>  verify-email
<Route element={<Layout />}>
  index                         HomePage
  about                         AboutPage            (lazy)
  movies, series                CatalogPage
  movies/:id                    MoviePage            (lazy)
  series/:id                    SeriesPage           (lazy)
  library                       LibraryPage
  library/:mediaKey/edit        LibraryEditPage
  lists/:listId                 ListPage             (owner / member / link)
  planner/:planId               PlanPage             (owner / member / link)
  <Route element={<ProtectedRoute />}>
    lists                       ListsPage            (lazy)
    lists/new, lists/:listId/edit  ListFormPage
    planner                     PlannerPage          (lazy)
    planner/new                 PlanCreatePage
    dashboard                   DashboardPage        (lazy)
    profile                     ProfileLayout        (lazy) → index: ProfilePage, settings: ProfileSettingsPage
  offline                       OfflinePage
  *                             NotFoundPage
```

Lazy pages are wrapped in one `<Suspense fallback={<PageLoader />}>` inside `Layout`, so the
header stays visible while a chunk loads.

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

## Current implementation (midterm)

### Routes and render tree

| Route                      | Page                | Purpose                                       |
| -------------------------- | ------------------- | --------------------------------------------- |
| `/`                        | `HomePage`          | Discover + search, filters, sort, pagination  |
| `/series/:id`              | `SeriesPage`        | Series details and episode heatmap            |
| `/watchlist`               | `WatchlistPage`     | Personal list with search, tabs, sort, paging |
| `/watchlist/new`           | `WatchlistAddPage`  | Add form (`?series=<id>` preselects a series) |
| `/watchlist/:entryId/edit` | `WatchlistEditPage` | Edit form                                     |
| `*`                        | `NotFoundPage`      | 404                                           |

```
<BrowserRouter>
└── <App>
    └── <WatchlistProvider>                 watchlist state (shared by several routes)
        └── <Layout>                        header, nav with watchlist count, footer
            ├── <HomePage>
            │   ├── <SearchBar>
            │   ├── <FilterBar> → <SelectField> ×5
            │   ├── <SkeletonGrid> | <StatusMessage> | <SeriesGrid> → <SeriesCard> → <RatingBadge>
            │   └── <Pagination>
            ├── <SeriesPage>
            │   └── <SeriesDetails key={id}>
            │       ├── <SeriesHero actions={<WatchlistButton>}>
            │       ├── <EpisodeHeatmap> → <HeatmapGrid>, <EpisodePanel>
            │       ├── <SeasonList>, <Trailer>, <CastList>
            │       └── <SeriesGrid>        recommendations (same component as Discover)
            ├── <WatchlistPage> → <StatusTabs>, <SelectField>, <WatchlistItem>, <Pagination>, <Toast>
            └── <WatchlistAddPage> / <WatchlistEditPage> → <WatchlistForm key=…> → <SeriesPicker>
```

### Where state lives and why

| State                                      | Where                                              | Why                                                                                       |
| ------------------------------------------ | -------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Discover filters, sort, page, search query | URL search params (`useSeriesFilters`)             | Shareable links, refresh keeps them, back/forward walks through them                      |
| Text typed in the search box               | `useState` in `SearchBar`                          | Changes on every keystroke; only the debounced value is committed to the URL              |
| API responses + request status             | `useState` inside `useFetch` / `useEpisodeRatings` | Each component that needs data owns its request                                           |
| Watchlist entries                          | `useState` in `WatchlistProvider` (context)        | Needed by the series page, the watchlist pages and the nav. Lifted to their common parent |
| Watchlist search, status tab, sort, page   | `useState` in `WatchlistPage`                      | Page-only UI state. Personal data, so there is nothing to share in a URL                  |
| Form values, "submitted" flag              | `useState` in `WatchlistForm`                      | Local to the form until submit                                                            |
| Selected episode in the heatmap            | `useState` in `EpisodeHeatmap` (id only)           | The episode object is derived from loaded data, so it can't go stale                      |
| Trailer playing                            | `useState` in `Trailer`                            | Pure UI state, reset per series by `key`                                                  |

Things that can be computed are **not** stored: filtered/sorted watchlist, total pages,
validation errors, `loading` status, best/worst episode, season averages.

### How API data reaches the UI

```
HomePage
  filters (URL) ──► toDiscoverParams() ──► endpoints.discoverSeries() ──► path string
                                                                          │
                                       useFetch(path) ◄────────────────────┘
                                         └─ useEffect([path, attempt]) → tmdbGet(path, { signal })
  { status, data, error, reload } ◄──────┘
        │
        ├─ loading → <SkeletonGrid>
        ├─ error   → <StatusMessage tone="error"> + "Try again" (reload)
        ├─ empty   → <StatusMessage> with a context-specific action
        └─ success → <SeriesGrid items={data.results} genresById={…}> → <SeriesCard> (props)
```

The data isn't shown as-is. Genre ids are turned into names, unaired episodes are marked as
"not rated" instead of 0, season averages and best/worst episodes are computed, trailers are
picked by priority, specials are moved to the end, and search results can be saved into the
watchlist.

### React concepts in the code

#### Effects, dependencies and cleanup

| Effect                                  | Dependencies                      | Cleanup                                |
| --------------------------------------- | --------------------------------- | -------------------------------------- |
| `useFetch`: load a TMDB path            | `[path, attempt]`                 | `controller.abort()` + `ignore = true` |
| `useEpisodeRatings`: load all seasons   | `[seriesId, seasonsKey, attempt]` | aborts every batch with one controller |
| `SearchBar`: debounce commit to the URL | `[value, query]`                  | `clearTimeout`                         |
| `useDebouncedValue`                     | `[value, delay]`                  | `clearTimeout`                         |
| `WatchlistProvider`: persist to storage | `[entries]`                       | none needed                            |
| `WatchlistProvider`: cross-tab sync     | `[]`                              | `removeEventListener('storage')`       |
| `WatchlistPage`: hide undo toast        | `[removed]`                       | `clearTimeout`                         |
| `Layout`: scroll to top on route change | `[pathname]`                      | none needed                            |

- **Stable dependencies.** Effects depend on strings, not on objects or arrays created during
  render. `useFetch` gets a path string. `useEpisodeRatings` turns the season list into
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
  several roles), `crypto.randomUUID()` for watchlist entries. Indexes are only used where the
  position _is_ the identity (skeleton placeholders, heatmap rows "episode N").
- `<SeriesDetails key={id}>`: going from one series to a recommended one would otherwise reuse
  the component and keep its state, for example a trailer still playing. The key makes React mount
  a fresh instance.
- `<WatchlistForm key={…}>`: the form reads `initialValues` only on mount, so a different entry
  or a preselected series gets its own instance.
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
| `/search/tv` can't filter by genre/rating/status or sort     | Search mode disables those controls and explains why. Year still works |
| `total_pages` can be 1000+, but pages above 500 return 400   | Pages are capped at 500, also when they come from the URL              |
| "Top rated" is dominated by shows with one 10/10 vote        | Rating sort and the rating filter require a minimum number of votes    |
| Discover "newest" includes announced shows dated years ahead | Newest sort is capped at today                                         |
| `append_to_response` accepts at most 20 sub-requests         | Seasons are split into batches of 20 and loaded with `Promise.all`     |
| Unaired episodes have rating `0`                             | Shown as "not rated", not as a bad score                               |
