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

| Function / endpoint builder                     |    Status     | Request                                                         |
| ----------------------------------------------- | :-----------: | --------------------------------------------------------------- |
| `tmdbGet(path, { signal })`                     |      ✅       | `GET https://api.themoviedb.org/3{path}` with Bearer token      |
| `buildPath(path, params)`                       |      ✅       | Builds a path + query string, skips empty values                |
| `imageUrl(path, size)`                          |      ✅       | `https://image.tmdb.org/t/p/{size}{path}`                       |
| `endpoints.genres(mediaType)`                   | ✅ / 🚧 movie | `/genre/{movie,tv}/list`                                        |
| `endpoints.discoverSeries(params)`              |      ✅       | `/discover/tv`                                                  |
| `endpoints.discoverMovies(params)`              |      🚧       | `/discover/movie`                                               |
| `endpoints.searchSeries({ query, page, year })` |      ✅       | `/search/tv`                                                    |
| `endpoints.searchMovies({ query, page, year })` |      🚧       | `/search/movie`                                                 |
| `endpoints.seriesDetails(id)`                   |      ✅       | `/tv/{id}?append_to_response=credits,videos,recommendations`    |
| `endpoints.movieDetails(id)`                    |      🚧       | `/movie/{id}?append_to_response=credits,videos,recommendations` |
| `endpoints.seasonsBatch(id, seasonNumbers)`     |      ✅       | `/tv/{id}?append_to_response=season/1,…` (≤ 20)                 |
| `endpoints.trending(mediaType)`                 |      🚧       | `/trending/{movie,tv}/week`                                     |
| `endpoints.languages()`                         |      🚧       | `/configuration/languages`                                      |

🚧 Every endpoint builder gets a `language` param from the current UI language, so a language
switch changes the path string and `useFetch` refetches.

🚧 `fetchCatalogPage({ mediaType, filters, page, size }, { signal })`: for `size` 40/60 loads
2/3 TMDB pages with `Promise.all` and returns
`{ results, page, totalPages, totalResults }` in app pages.

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

### `libraryService.ts` 🚧

| Function                                             | Returns                       | Notes                                      |
| ---------------------------------------------------- | ----------------------------- | ------------------------------------------ |
| `watchLibrary(uid, callback)`                        | `unsubscribe`                 | Whole library, ordered by `updatedAt`      |
| `addToLibrary(uid, media, { status, score, notes })` | `Promise<void>`               | Doc id = media key                         |
| `updateLibraryEntry(uid, mediaKey, changes)`         | `Promise<void>`               | Sets `completedAt` when status → completed |
| `removeFromLibrary(uid, mediaKey)`                   | `Promise<void>`               |                                            |
| `mergeGuestLibrary(uid, entries)`                    | `Promise<{ added, skipped }>` | Batch; existing entries win                |

### `listsService.ts` 🚧

| Function                                               | Returns                | Notes                                 |
| ------------------------------------------------------ | ---------------------- | ------------------------------------- |
| `watchMyLists(uid, callback)`                          | `unsubscribe`          | `ownerUid == uid`                     |
| `watchSharedLists(email, callback)`                    | `unsubscribe`          | `memberEmails array-contains email`   |
| `watchList(listId, callback)`                          | `unsubscribe`          | Single doc (owner, member or link)    |
| `watchListItems(listId, callback)`                     | `unsubscribe`          | Ordered by `position`                 |
| `createList(user, { name, description, emoji })`       | `Promise<string>` (id) |                                       |
| `updateList(listId, changes)`                          | `Promise<void>`        | Owner only                            |
| `deleteList(listId)`                                   | `Promise<void>`        | Deletes items and the list in batches |
| `addListItem(listId, media, user)`                     | `Promise<void>`        | Batch: item + `itemCount` increment   |
| `updateListItem(listId, mediaKey, { note, position })` | `Promise<void>`        |                                       |
| `removeListItem(listId, mediaKey)`                     | `Promise<void>`        | Batch: delete + `itemCount` decrement |
| `copyList(listId, user)`                               | `Promise<string>`      | New private list owned by `user`      |

### `sharingService.ts` 🚧

Works for both collections: `kind` is `"lists"` or `"plans"`.

| Function                                       | Returns                                             | Notes                               |
| ---------------------------------------------- | --------------------------------------------------- | ----------------------------------- |
| `setVisibility(kind, id, "private" \| "link")` | `Promise<void>`                                     | Owner only                          |
| `addMember(kind, id, email, role)`             | `Promise<void>`                                     | Validates email, can't add yourself |
| `changeRole(kind, id, email, role)`            | `Promise<void>`                                     |                                     |
| `removeMember(kind, id, email)`                | `Promise<void>`                                     |                                     |
| `leave(kind, id, email)`                       | `Promise<void>`                                     | A member removes themselves         |
| `getRole(doc, user)`                           | `"owner" \| "editor" \| "viewer" \| "link" \| null` | Pure, for the UI                    |
| `shareUrl(kind, id)`                           | string                                              | `https://…/lists/{id}`              |

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
| `watchlistStorage.ts`   |   ✅   | `loadWatchlist()`, `saveWatchlist(entries)` (legacy)                                                 |
| `libraryStorage.ts`     |   🚧   | `loadGuestLibrary()`, `saveGuestLibrary(entries)`, `clearGuestLibrary()`, `migrateLegacyWatchlist()` |
| `preferencesStorage.ts` |   🚧   | `loadPreferences()`, `savePreferences({ theme, language })`                                          |

All of them catch storage errors (private mode, quota) and fall back to defaults.

## Redux store: `src/store/` 🚧

| Module                | Exports                                                                                                                                                                    |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `store.ts`            | `store`, `RootState`, `AppDispatch`                                                                                                                                        |
| `hooks.ts`            | `useAppDispatch`, `useAppSelector` (typed)                                                                                                                                 |
| `authSlice.ts`        | `authChanged`, `signInWithEmail`, `signInWithGoogle`, `signUp`, `signOut` thunks; `selectUser`, `selectAuthStatus`                                                         |
| `librarySlice.ts`     | `librarySynced`, `addToLibrary`, `updateLibraryEntry`, `removeFromLibrary` thunks; `selectLibrary`, `selectEntry(mediaKey)`, `selectFilteredLibrary`, `selectLibraryStats` |
| `preferencesSlice.ts` | `themeChanged`, `languageChanged`; `selectTheme`, `selectLanguage`                                                                                                         |
| `listeners.ts`        | Listener middleware: auth subscription, library sync, preferences persistence                                                                                              |

Thunks call the services above; reducers stay pure. The store only holds serializable data.

## Hooks

| Hook                                                  | Status  | Returns                                                                                    |
| ----------------------------------------------------- | :-----: | ------------------------------------------------------------------------------------------ |
| `useFetch(path)`                                      |   ✅    | `{ status, data, error, reload }` for a TMDB path                                          |
| `useDebouncedValue(value, ms)`                        |   ✅    | Debounced value                                                                            |
| `useEpisodeRatings(id, seasons)`                      |   ✅    | Episode ratings for the heatmap                                                            |
| `useSeriesFilters()` → `useCatalogFilters(mediaType)` | ✅ → 🚧 | Filters, sort, page, size from the URL, plus setters                                       |
| `useGenres(mediaType)`                                | ✅ / 🚧 | Genre list and id → name map                                                               |
| `useAuth()`                                           |   🚧    | `{ user, status, error }` from the store + sign-in/out actions                             |
| `useFirestoreQuery(subscribe, deps)`                  |   🚧    | `{ status, data, error }` for any `watch*` function                                        |
| `useLibrary()`                                        |   🚧    | Entries + `add`, `update`, `remove`, `getEntry(mediaKey)`; uses guest storage or Firestore |
| `useLists()` / `useList(id)`                          |   🚧    | Lists, list + items + current role, CRUD actions                                           |
| `usePlanner()` / `usePlan(id)`                        |   🚧    | Plans, sessions in range, actions                                                          |
| `useDashboardStats(period)`                           |   🚧    | Memoized statistics and breakdowns                                                         |
| `useTheme()` / `useLanguage()`                        |   🚧    | Current value + setter                                                                     |
| `useOnlineStatus()`                                   |   🚧    | `true` / `false` from `online` / `offline` events                                          |
