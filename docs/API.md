# API Documentation

How the app talks to its data sources. UI components never call `fetch`, Firestore or
`localStorage` directly. They use hooks, and hooks use the modules below.

```
pages / components
      │
      ▼
hooks (useFetch, useLibrary, useLists, usePlanner, …)
      │
      ├──► src/api/tmdb.ts          TMDB REST (read-only)
      ├──► src/services/*.ts        Firebase Auth + Firestore
      └──► src/storage/*.ts         localStorage (guests, preferences)
                │
src/utils/*.ts  pure functions: normalization, filters, schedule, stats
```

Status legend: ✅ exists (midterm), 🚧 planned for the end-term.

Data shapes referenced here are defined in [DATA_MODEL.md](DATA_MODEL.md) and as TypeScript
types in `src/types/`.

## Conventions

- Every async function returns a typed **Promise**, e.g. `tmdbGet<SeriesDetails>(path)`.
- TMDB functions accept `{ signal }` (an `AbortSignal`) so that outdated requests can be
  cancelled.
- Firestore "watch" functions subscribe with `onSnapshot` and **return an unsubscribe
  function**. Hooks call it in the effect cleanup.
- Errors are normalized:
  - TMDB → `ApiError { message, status }` (`status: 0` = network error).
  - Firebase → `AppError { code, message }`, where `message` is a user-friendly text from
    `utils/firebaseErrors.ts` (for example `auth/invalid-credential` → "Wrong email or
    password"). `permission-denied` → "You don't have access to this".

## TMDB: `src/api/tmdb.ts`

| Function / endpoint builder                     | Status | Request                                                         |
| ----------------------------------------------- | :----: | --------------------------------------------------------------- |
| `tmdbGet(path, { signal })`                     |   ✅   | `GET https://api.themoviedb.org/3{path}` with Bearer token      |
| `buildPath(path, params)`                       |   ✅   | Builds a path + query string, skips empty values                |
| `imageUrl(path, size)`                          |   ✅   | `https://image.tmdb.org/t/p/{size}{path}`                       |
| `endpoints.genres(mediaType)`                   |   ✅   | `/genre/{movie,tv}/list`                                        |
| `endpoints.discoverSeries(params)`              |   ✅   | `/discover/tv`                                                  |
| `endpoints.discoverMovies(params)`              |   ✅   | `/discover/movie`                                               |
| `endpoints.searchSeries({ query, page, year })` |   ✅   | `/search/tv`                                                    |
| `endpoints.searchMovies({ query, page, year })` |   ✅   | `/search/movie`                                                 |
| `endpoints.seriesDetails(id)`                   |   ✅   | `/tv/{id}?append_to_response=credits,videos,recommendations`    |
| `endpoints.movieDetails(id)`                    |   ✅   | `/movie/{id}?append_to_response=credits,videos,recommendations` |
| `endpoints.seasonsBatch(id, seasonNumbers)`     |   ✅   | `/tv/{id}?append_to_response=season/1,…` (≤ 20)                 |
| `endpoints.trending(mediaType)`                 |   ✅   | `/trending/{movie,tv}/week`                                     |
| `tmdbGetAll(paths, { signal })`                 |   ✅   | Several paths in parallel (`Promise.all`), one shared signal    |

🚧 Every endpoint builder gets a `language` param from the current UI language, so a language
switch changes the path string and `useFetch` refetches.

**Page size.** TMDB always returns 20 titles per page. For 40 or 60 per page, `useCatalog`
loads 2 or 3 consecutive TMDB pages with `tmdbGetAll` (one `AbortController` for all of them)
and `utils/catalog.ts → mergeCatalogPages` joins them into `{ items, totalPages, totalResults }`
in app pages: `totalPages = ceil(min(total_pages, 500) / pagesPerAppPage)`. Titles repeated
across two TMDB pages (popularity shifts between requests) are dropped, so React keys stay
unique. Changing the size keeps the first visible title on screen (`pageAfterResize`).

**Original language** uses a short fixed list of ISO 639-1 codes with names from
`Intl.DisplayNames` instead of the ~190 entries of `/configuration/languages`: a long select is
hard to use, and the names need no request.

**Errors handled:** missing token (401), invalid id (404 → "not found" state), page > 500
(capped), network failure (`status: 0`, retry button), aborted request (ignored).

## Firebase: `src/services/`

### `firebase.ts` 🚧

Initializes the app from `VITE_FIREBASE_*` env variables and exports `app`, `auth`, `db`.
Firestore uses `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` for
offline support.

### `authService.ts` 🚧

| Function                                            | Returns         | Notes                                                                          |
| --------------------------------------------------- | --------------- | ------------------------------------------------------------------------------ |
| `signUpWithEmail({ email, password, displayName })` | `Promise<User>` | Creates the user, sets the name, sends verification email, creates the profile |
| `signInWithEmail({ email, password })`              | `Promise<User>` |                                                                                |
| `signInWithGoogle()`                                | `Promise<User>` | `signInWithPopup` + `GoogleAuthProvider`                                       |
| `signOutUser()`                                     | `Promise<void>` |                                                                                |
| `sendVerificationEmail()`                           | `Promise<void>` |                                                                                |
| `resetPassword(email)`                              | `Promise<void>` |                                                                                |
| `onAuthChange(callback)`                            | `unsubscribe`   | Wraps `onIdTokenChanged`, so `email_verified` updates after verification       |
| `reloadUser()`                                      | `Promise<User>` | Refreshes the token after the user verifies                                    |

### `profileService.ts` 🚧

| Function                                  | Returns                                                    |
| ----------------------------------------- | ---------------------------------------------------------- |
| `ensureProfile(user)`                     | `Promise<Profile>`: creates `users/{uid}` on first sign-in |
| `watchProfile(uid, callback)`             | `unsubscribe`                                              |
| `updateProfile(uid, changes)`             | `Promise<void>`: name, settings                            |
| `watchActivity(uid, { limit }, callback)` | `unsubscribe`                                              |
| `logActivity(uid, activity)`              | `Promise<void>` (usually added to a batch instead)         |

### `libraryService.ts` ✅

| Function                                    | Returns                       | Notes                                                             |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `watchLibrary(uid, onData, onError)`        | `unsubscribe`                 | `onSnapshot` on the whole library; pending server times estimated |
| `addEntry(uid, entry)`                      | `Promise<void>`               | Doc id = media key; `addedAt`/`updatedAt` = `serverTimestamp()`   |
| `updateEntry(uid, key, changes, completed)` | `Promise<void>`               | `completed`: `'set'` / `'clear'` / `'keep'` for `completedAt`     |
| `restoreEntry(uid, entry)`                  | `Promise<void>`               | "Undo" after a removal, keeps the original dates                  |
| `removeEntry(uid, key)`                     | `Promise<void>`               |                                                                   |
| `mergeGuestLibrary(uid, entries)`           | `Promise<{ added, skipped }>` | Batches of 400; entries already in the account win                |

### `listsService.ts` ✅

Loaded with `import()` (`loadListsService` in `hooks/useLists.ts`), so the Firestore SDK stays
out of the main chunk. Timestamps are converted to ISO strings; pending server timestamps are
read as estimates.

| Function                                           | Returns                | Notes                                                      |
| -------------------------------------------------- | ---------------------- | ---------------------------------------------------------- |
| `watchMyLists(uid, onData, onError)`               | `unsubscribe`          | `ownerUid == uid`, `updatedAt` desc (composite index)      |
| `watchList(listId, onData, onError)`               | `unsubscribe`          | Single doc; `null` when it doesn't exist                   |
| `watchListItems(listId, onData, onError)`          | `unsubscribe`          | Ordered by `position`                                      |
| `createList(author, { name, description, emoji })` | `Promise<string>` (id) | Private, empty; resolves when the server accepted it       |
| `updateList(listId, draft)`                        | `Promise<void>`        | Owner only (rules)                                         |
| `deleteList(listId)`                               | `Promise<void>`        | Items in batches of 400, the list itself in the last batch |
| `addItems(listId, media[], author, covers)`        | `Promise<void>`        | One batch: items + `itemCount: increment(n)` + `covers`    |
| `removeItem(listId, mediaKey, covers)`             | `Promise<void>`        | One batch: delete + `increment(-1)` + `covers`             |
| `restoreItem(listId, item, covers)`                | `Promise<void>`        | "Undo": same note, position, author and `addedAt`          |
| `updateItemNote(listId, mediaKey, note)`           | `Promise<void>`        | ≤ 200 characters                                           |
| `listsContaining(listIds, mediaKey)`               | `Promise<Set<string>>` | One `getDoc` per list, for the "Add to list" checkboxes    |
| `watchSharedLists(email, onData, onError)`         | `unsubscribe`          | `memberEmails array-contains email`, `updatedAt` desc      |
| `copyList(source, author)`                         | `Promise<string>` (id) | New private list first, then items in batches of 400       |

### `sharingService.ts` ✅

Works for both collections: `collection` is `"lists"` or `"plans"` (only lists have a UI so far).
Loaded with `import()` from `hooks/useSharing.ts`. Every change is **one** `updateDoc`, so
`roles` and `memberEmails` never disagree. Emails contain dots, so a member's role is addressed
with `new FieldPath('roles', email)`: the string path `"roles.dan@gmail.com"` would mean
`roles → dan@gmail → com`.

| Function                                                  | Returns         | Notes                                                             |
| --------------------------------------------------------- | --------------- | ----------------------------------------------------------------- |
| `setVisibility(collection, id, "private" \| "link")`      | `Promise<void>` | Owner only (rules)                                                |
| `addMember(collection, id, roles, email, role, ownEmail)` | `Promise<void>` | `validateInvite` again, lowercase; role + `arrayUnion(email)`     |
| `changeRole(collection, id, email, role)`                 | `Promise<void>` | Owner only                                                        |
| `removeMember(collection, id, email)`                     | `Promise<void>` | `deleteField()` on the role + `arrayRemove(email)`                |
| `leave(collection, id, ownEmail)`                         | `Promise<void>` | Same write as `removeMember`; rules (`isLeaving`) allow only self |

Pure helpers in `utils/sharing.ts`:

| Function                                     | Returns                                             | Notes                                                   |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `roleOf(doc, user)`                          | `"owner" \| "editor" \| "viewer" \| "link" \| null` | Mirrors the rules: member roles need a verified email   |
| `validateInvite(email, { ownEmail, roles })` | error text \| `null`                                | Format, not yourself, not already a member, ≤ 20 people |
| `normalizeEmail(email)`                      | string                                              | `trim().toLowerCase()`                                  |
| `membersOf(doc)`                             | `Member[]`                                          | Editors first, then by email                            |
| `shareUrl(collection, id)`                   | string                                              | `https://…/lists/{id}` (`/planner/{id}` for plans)      |

### `plannerService.ts` 🚧

| Function                                                            | Returns           | Notes                                                 |
| ------------------------------------------------------------------- | ----------------- | ----------------------------------------------------- |
| `loadSeriesEpisodes(tvId, { from, signal })`                        | `Promise<Unit[]>` | Batched seasons from TMDB, skips specials and unaired |
| `loadListMovies(listId)`                                            | `Promise<Unit[]>` | Movies of a list with runtimes                        |
| `createPlan(user, { kind, media, sourceListId, options, units })`   | `Promise<string>` | Plan + sessions + library + activity                  |
| `watchMyPlans(uid, callback)` / `watchSharedPlans(email, callback)` | `unsubscribe`     |                                                       |
| `watchPlan(planId, callback)`                                       | `unsubscribe`     |                                                       |
| `watchSessions(planId, { from, to }, callback)`                     | `unsubscribe`     | Date range for the calendar                           |
| `completeSession(planId, sessionId, user)`                          | `Promise<void>`   | Batch, see DATA_MODEL                                 |
| `rescheduleSession(planId, sessionId, newDate, { shiftLater })`     | `Promise<void>`   |                                                       |
| `skipSession(planId, sessionId)`                                    | `Promise<void>`   |                                                       |
| `deletePlan(planId)`                                                | `Promise<void>`   |                                                       |

Pure helpers in `src/utils/schedule.ts` (unit tested on their own):

| Function                                   | Description                                                                                           |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `buildSchedule(units, options)`            | Splits units into sessions of `perSession` and assigns dates on the allowed weekdays from `startDate` |
| `shiftSessions(sessions, fromIndex, days)` | Moves later sessions, keeping them on allowed weekdays                                                |
| `planSummary(sessions)`                    | `{ sessions, minutes, endDate }` for the preview                                                      |
| `toIcs(plan, sessions)`                    | iCalendar text for export                                                                             |

## localStorage: `src/storage/`

| Module                  | Status | Functions                                                                                            |
| ----------------------- | :----: | ---------------------------------------------------------------------------------------------------- |
| `libraryStorage.ts`     |   ✅   | `loadGuestLibrary()`, `saveGuestLibrary(entries)`, `clearGuestLibrary()`, `migrateLegacyWatchlist()` |
| `preferencesStorage.ts` |   ✅   | `loadPreferences()`, `savePreferences({ theme, language })`                                          |

All of them catch storage errors (private mode, quota) and fall back to defaults.

## Redux store: `src/store/` ✅

| Module                | Exports                                                                                                                                                                                |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store.ts`            | `store`, `RootState`, `AppDispatch`, `AppThunk`                                                                                                                                        |
| `hooks.ts`            | `useAppDispatch`, `useAppSelector` (typed)                                                                                                                                             |
| `authSlice.ts`        | `authChanged`; `signIn`, `signUp`, `signInWithGoogle`, `signOut` thunks; `selectAuthUser`, `selectAuthStatus`                                                                          |
| `librarySlice.ts`     | Entities by media key (`createEntityAdapter`); `addToLibrary`, `updateLibraryEntry`, `removeFromLibrary`, `restoreLibraryEntry` thunks; `selectLibraryCounts`, `selectFilteredLibrary` |
| `preferencesSlice.ts` | `themeChanged`, `languageChanged`; `selectResolvedTheme`                                                                                                                               |
| `listeners.ts`        | Auth subscription, preferences persistence                                                                                                                                             |
| `libraryListeners.ts` | Per-user Firestore subscription (cancelled on sign-out), guest merge on sign-in, guest persistence, cross-tab sync                                                                     |

Thunks call the services above; reducers stay pure. The store only holds serializable data.

## Hooks

| Hook                                                    | Status | Returns                                                                                       |
| ------------------------------------------------------- | :----: | --------------------------------------------------------------------------------------------- |
| `useRequest(key, load)`                                 |   ✅   | Generic `{ status, data, error, reload }` for any async loader keyed by a string              |
| `useFetch(path)`                                        |   ✅   | `{ status, data, error, reload }` for a TMDB path (built on `useRequest`)                     |
| `useCatalog({ mediaType, filters, query, page, size })` |   ✅   | One app page of a catalog (1–3 TMDB pages), normalized to `MediaSummary`                      |
| `useDebouncedValue(value, ms)`                          |   ✅   | Debounced value                                                                               |
| `useEpisodeRatings(id, seasons)`                        |   ✅   | Episode ratings for the heatmap                                                               |
| `useCatalogFilters(mediaType)`                          |   ✅   | Filters, sort, page, size from the URL, plus setters                                          |
| `useGenres(mediaType)`                                  |   ✅   | Genre list and id → name map                                                                  |
| `useAuth()`                                             |   🚧   | `{ user, status, error }` from the store + sign-in/out actions                                |
| `useSubscription(key, subscribe)`                       |   ✅   | `{ status, data, error, retry }` for any realtime `watch*` listener (async subscribe allowed) |
| `useLibrary()` / `useLibraryEntry(key)`                 |   ✅   | Entries, status, `isGuest` + `add`, `update`, `remove`, `restore`; guest storage or Firestore |
| `useLibraryFilters()`                                   |   ✅   | Library search, status, type, genre, sort, page, view from the URL                            |
| `useTimedState(ms, initial?)`                           |   ✅   | A value that clears itself (undo toasts)                                                      |
| `useMyLists()` / `useList(id)`                          |   ✅   | My lists; one list + items + current role (`missing` for no access)                           |
| `useTitleSearch(query)`                                 |   ✅   | Debounced movie + series search for the "Add titles" picker                                   |
| `usePlanner()` / `usePlan(id)`                          |   🚧   | Plans, sessions in range, actions                                                             |
| `useDashboardStats(period)`                             |   🚧   | Memoized statistics and breakdowns                                                            |
| `useTheme()` / `useLanguage()`                          |   🚧   | Current value + setter                                                                        |
| `useOnlineStatus()`                                     |   🚧   | `true` / `false` from `online` / `offline` events                                             |
