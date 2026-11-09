# API Documentation

How the app talks to its data sources. UI components never call `fetch`, Firestore or
`localStorage` directly. They use hooks, and hooks use the modules below.

```
pages / components
      │
      ▼
hooks (useFetch, useLibrary, useMyLists, usePlanner, …)
      │
      ├──► src/shared/api/tmdb.ts          TMDB REST (read-only)
      ├──► src/services/*.ts        Firebase Auth + Firestore
      └──► src/storage/*.ts         localStorage (guests, preferences)
                │
src/utils/*.ts  pure functions: normalization, filters, schedule, stats
```

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

## TMDB: `src/shared/api/tmdb.ts`

| Function / endpoint builder                     | Status | Request                                                                                      |
| ----------------------------------------------- | :----: | -------------------------------------------------------------------------------------------- |
| `tmdbGet(path, { signal })`                     |   ✅   | `GET /api/tmdb{path}`: our proxy adds the token and forwards to `api.themoviedb.org/3`       |
| `buildPath(path, params)`                       |   ✅   | Builds a path + query string, skips empty values                                             |
| `imageUrl(path, size)`                          |   ✅   | `https://image.tmdb.org/t/p/{size}{path}`                                                    |
| `endpoints.genres(mediaType)`                   |   ✅   | `/genre/{movie,tv}/list`                                                                     |
| `endpoints.discoverSeries(params)`              |   ✅   | `/discover/tv`                                                                               |
| `endpoints.discoverMovies(params)`              |   ✅   | `/discover/movie`                                                                            |
| `endpoints.searchSeries({ query, page, year })` |   ✅   | `/search/tv`                                                                                 |
| `endpoints.searchMovies({ query, page, year })` |   ✅   | `/search/movie`                                                                              |
| `endpoints.seriesDetails(id)`                   |   ✅   | `/tv/{id}?append_to_response=credits,videos,recommendations,translations,watch/providers`    |
| `endpoints.movieDetails(id)`                    |   ✅   | `/movie/{id}?append_to_response=credits,videos,recommendations,translations,watch/providers` |
| `endpoints.seasonsBatch(id, seasonNumbers)`     |   ✅   | `/tv/{id}?append_to_response=season/1,…` (≤ 20)                                              |
| `endpoints.trending(mediaType)`                 |   ✅   | `/trending/{movie,tv}/week`                                                                  |
| `tmdbGetAll(paths, { signal })`                 |   ✅   | Several paths in parallel (`Promise.all`), one shared signal                                 |

✅ Every request carries `language=en-US | ru-RU | kk-KZ` for the current UI language
(`tmdbGet` appends it unless the path already has one). The hooks (`useFetch`, `useCatalog`,
`useTitleSearch`, `useEpisodeRatings`) put the language into their request key through
`useTmdbLanguage()`, so a language switch changes the key and the data is fetched again.

- Details endpoints append `translations` and `include_video_language=<lang>,en,null`:
  `overviewOf()` shows the English overview when TMDB has none in the current language
  (common for Kazakh), and trailers fall back to English ones.
- Genres, episode names and recommendations come back in the UI language from the same call.
- The planner's one-off requests (`seriesSummary`, `seasonsBatch`, `movieSummary`) also get the
  language; stored plan data keeps the language it was created in.

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

### `firebase.ts`

Initializes the app from `VITE_FIREBASE_*` env variables and exports `app`, `auth`, `db`.
Firestore uses `persistentLocalCache({ tabManager: persistentMultipleTabManager() })` for
offline support.

### `authService.ts`

| Function                                            | Returns                          | Notes                                                                                 |
| --------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| `signUpWithEmail({ email, password, displayName })` | `Promise<User>`                  | Creates the user, sets the name, sends verification email, creates the profile        |
| `signInWithEmail({ email, password })`              | `Promise<User>`                  |                                                                                       |
| `signInWithGoogle()`                                | `Promise<User \| 'redirecting'>` | Popup on desktop; redirect on phones and in the installed app (`utils/signInMode.ts`) |
| `finishGoogleRedirect()`                            | `Promise<User \| null>`          | `getRedirectResult` after coming back; called only if a redirect was started          |
| `signOutUser()`                                     | `Promise<void>`                  |                                                                                       |
| `sendVerificationEmail()`                           | `Promise<void>`                  |                                                                                       |
| `resetPassword(email)`                              | `Promise<void>`                  |                                                                                       |
| `onAuthChange(callback)`                            | `unsubscribe`                    | Wraps `onIdTokenChanged`, so `email_verified` updates after verification              |
| `reloadUser()`                                      | `Promise<User>`                  | Refreshes the token after the user verifies                                           |

`authService.updateDisplayName(name)` → `Promise<void>`: Firebase Auth `updateProfile`. The
`auth/updateDisplayName` thunk runs it together with `updateUserProfile`, then puts the name into
the store (updateProfile doesn't refresh the token, so `authChanged` wouldn't bring it).

### `profileService.ts` ✅

| Function                             | Returns                                                                                                 |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `ensureProfile(user, settings)`      | `Promise<void>`: creates `users/{uid}` on first sign-in; writes `settings` only if the account has none |
| `watchProfile(uid, onData, onError)` | `unsubscribe`; `settings` is `null` when missing or invalid                                             |
| `updateUserProfile(uid, changes)`    | `Promise<void>`: `displayName` and/or `settings`, plus `updatedAt`                                      |

### `activityService.ts` ✅

| Function                                     | Returns                                                                                |
| -------------------------------------------- | -------------------------------------------------------------------------------------- |
| `logActivity(uid, draft)`                    | `void`: fire-and-forget `setDoc`; a failure is logged, never thrown (library, lists)   |
| `addActivity(batch, uid, draft)`             | `void`: the record goes into the caller's batch (planner: same commit as the change)   |
| `watchActivity(uid, count, onData, onError)` | `unsubscribe`: `orderBy('createdAt', 'desc')` + `limit(count)`; single field, no index |

Recorded: `library.add` (addEntry), `library.status` (updateEntry when the status changes; score,
notes and progress don't count), `list.create` (createList, so copies too), `plan.create`,
`session.done`, `plan.done`. Guests record nothing.

### `libraryService.ts` ✅

| Function                                    | Returns                       | Notes                                                             |
| ------------------------------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `watchLibrary(uid, onData, onError)`        | `unsubscribe`                 | `onSnapshot` on the whole library; pending server times estimated |
| `addEntry(uid, entry)`                      | `Promise<void>`               | Doc id = media key; `addedAt`/`updatedAt` = `serverTimestamp()`   |
| `updateEntry(uid, key, changes, completed)` | `Promise<void>`               | `completed`: `'set'` / `'clear'` / `'keep'` for `completedAt`     |
| `setOrders(uid, updates)`                   | `Promise<void>`               | Writes only `order` for the moved titles in atomic batches        |
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

Works for both collections: `collection` is `"lists"` or `"plans"`; the same `ShareDialog` serves both.
Loaded with `import()` from `hooks/useSharing.ts`. Every change is **one** write (`updateDoc`, or a `writeBatch`
for `addMember`, which also adds the notification), so `roles` and `memberEmails` never
disagree. Emails contain dots, so a member's role is addressed
with `new FieldPath('roles', email)`: the string path `"roles.dan@gmail.com"` would mean
`roles → dan@gmail → com`.

| Function                                                 | Returns         | Notes                                                                                     |
| -------------------------------------------------------- | --------------- | ----------------------------------------------------------------------------------------- |
| `setVisibility(collection, id, "private" \| "link")`     | `Promise<void>` | Owner only (rules)                                                                        |
| `addMember(collection, id, roles, email, role, context)` | `Promise<void>` | `validateInvite` again, lowercase; role + `arrayUnion(email)` + notification in one batch |
| `changeRole(collection, id, email, role)`                | `Promise<void>` | Owner only                                                                                |
| `removeMember(collection, id, email)`                    | `Promise<void>` | `deleteField()` on the role + `arrayRemove(email)`                                        |
| `leave(collection, id, ownEmail)`                        | `Promise<void>` | Same write as `removeMember`; rules (`isLeaving`) allow only self                         |

Pure helpers in `utils/sharing.ts`:

| Function                                     | Returns                                             | Notes                                                   |
| -------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| `roleOf(doc, user)`                          | `"owner" \| "editor" \| "viewer" \| "link" \| null` | Mirrors the rules: member roles need a verified email   |
| `validateInvite(email, { ownEmail, roles })` | error text \| `null`                                | Format, not yourself, not already a member, ≤ 20 people |
| `normalizeEmail(email)`                      | string                                              | `trim().toLowerCase()`                                  |
| `membersOf(doc)`                             | `Member[]`                                          | Editors first, then by email                            |
| `shareUrl(collection, id)`                   | string                                              | `https://…/lists/{id}` (`/planner/{id}` for plans)      |

### `notificationsService.ts` ✅

Loaded with `import()` from `hooks/useNotifications.ts`. Collection `notifications`
(docs/DATA_MODEL.md). No account lookup anywhere.

| Function                                     | Returns         | Notes                                                                         |
| -------------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| `addSharedNotice(batch, notice)`             | `void`          | Adds the "you were given access" document to the invite's batch               |
| `watchNotifications(email, onData, onError)` | `Unsubscribe`   | Newest 30 for the lowercase email, live; needs the (toEmail, createdAt) index |
| `markRead(id)` / `markAllRead(ids)`          | `Promise<void>` | Sets `readAt`; the batch version for "Mark all as read"                       |
| `decline(notification, ownEmail)`            | `Promise<void>` | Leave + delete in one batch; if access is already gone, only deletes          |

Pure helpers in `utils/invite.ts`: `inviteUrl(collection, id, email)` (`/signup?invite=…&email=…`),
`parseInvite(value)` / `invitePath(value)` (accepts only `lists|plans/<id>`), `inviteMailto(email, subject, body)`.

### `plannerService.ts` ✅

Loaded with `import()` from `hooks/usePlanner.ts` (`loadPlannerService`). Every write that
changes more than one document is one batch (see DATA_MODEL, "Business operations").

| Function                                              | Returns                                | Notes                                                                      |
| ----------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------------- |
| `loadSeriesEpisodes(tvId, signal?)`                   | `{ media, units }`                     | `/tv/{id}`, then seasons in batches of 20 in parallel; no specials/unaired |
| `loadListMovies(listId, signal?)`                     | `{ name, posterPath, units, skipped }` | List items in order, `/movie/{id}` per movie for runtime; series skipped   |
| `createPlan(owner, draft, color)`                     | `Promise<string>` (id)                 | Plan + sessions + library + activity, chunks of 400 writes                 |
| `watchMyPlans(uid, …)` / `watchSharedPlans(email, …)` | `unsubscribe`                          | `ownerUid ==` / `memberEmails array-contains`, `orderBy('nextDate')`       |
| `watchPlan(id, …)`                                    | `unsubscribe`                          | `null` when missing                                                        |
| `watchSessions(planId, { from, to } \| null, …)`      | `unsubscribe`                          | `date >= from && date <= to` (single-field index) or all sessions          |
| `completeSession(plan, session, by)`                  | `Promise<void>`                        | Session + plan + **marker's** library + activity in one batch              |
| `skipSession(plan, session, by)`                      | `Promise<void>`                        | Skipped + copy at the end on the next plan weekday                         |
| `undoSession(plan, session)`                          | `Promise<void>`                        | Back to pending; deletes a skip's pending copy                             |
| `rescheduleSession(plan, session, date, shiftLater)`  | `Promise<void>`                        | Moves later pending sessions by the same days when asked                   |
| `deletePlan(id)`                                      | `Promise<void>`                        | Sessions in batches, the plan last                                         |

Pure helpers in `src/utils/schedule.ts` and `src/utils/calendar.ts` (no React, no Firestore).
Days are `"YYYY-MM-DD"` in local time; day math runs on UTC dates, so DST never shifts a day.

| Function                                                          | Description                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `buildSchedule(units, { startDate, weekdays, time, perSession })` | Sessions of `perSession` units on the chosen weekdays from `startDate`; `[]` without weekdays    |
| `scheduleProblem(options)`                                        | Error text for the stepper (no weekdays, bad time…) or `null`                                    |
| `shiftSessions(sessions, id, date, shiftLater)`                   | `{ id, date }[]` changes: the moved session and, optionally, later pending ones by the same days |
| `planDates(sessions)` / `planSummary(sessions, weekdays)`         | `nextDate`/`endDate`; sessions, minutes, nights a week, first and finish date                    |
| `nextSlot(after, weekdays)`                                       | First allowed weekday after a day (where a skip's copy goes)                                     |
| `unitsLabel(units)`                                               | `S2E5`, `S2E5–E6`, `S2E13–S3E1`, or movie titles                                                 |
| `toIcs(name, events, now)`                                        | iCalendar text (RFC 5545: escaping, 75-octet folding, CRLF); times converted to UTC per day      |
| `monthGrid(month)`, `addDays`, `weekdayOf`, `localToday`          | Calendar-day helpers (`utils/calendar.ts`)                                                       |

## Statistics: `src/utils/stats.ts` ✅

Pure functions for the dashboard; inputs are library entries and `PlannedSession`s.

| Function                                       | Returns                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `parsePeriod(value)`, `periodStart(p, today)`  | `'all' \| '30d' \| 'year'` (unknown → `all`); first day of the period or `null`            |
| `entriesInPeriod(entries, start)`              | Entries added or changed since `start` (`updatedAt`)                                       |
| `minutesWatched(entry)`                        | Completed movie runtime or watched episodes × runtime; `null` when the runtime is unknown  |
| `libraryStats(entries)`                        | titles, completed (+ share), average score (1 decimal, `null` if none), minutes, noRuntime |
| `byStatus`, `byMediaType`, `topGenres`         | Bars `{ value, label, count }`; `value` is the library filter the bar opens                |
| `planStats(plans, sessions, sharedIds, today)` | Done / planned (not skipped) this week Mon–Sun, pending tonight, active and shared plans   |
| `sessionsByWeekday(sessions, start, today)`    | Watched sessions per weekday, Monday first                                                 |
| `upcomingSessions(sessions, today, limit)`     | Next pending sessions of active plans                                                      |

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
| `statsSelectors.ts`   | `selectLibraryDashboard(state, start)`: entries in the period, stats, status and type breakdowns (memoized)                                                                            |
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
| `useGenres(mediaType)`                                  |   ✅   | Genre list, id → name map, request `status` and `reload`                                      |
| `useAuth()`                                             |   ✅   | `{ user, status, error }` from the store + sign-in/out actions                                |
| `useSubscription(key, subscribe)`                       |   ✅   | `{ status, data, error, retry }` for any realtime `watch*` listener (async subscribe allowed) |
| `useLibrary()` / `useLibraryEntry(key)`                 |   ✅   | Entries, status, `isGuest` + `add`, `update`, `remove`, `restore`; guest storage or Firestore |
| `useLibraryFilters()`                                   |   ✅   | Library search, status, type, genre, sort, page, view from the URL                            |
| `useTimedState(ms, initial?)`                           |   ✅   | A value that clears itself (undo toasts)                                                      |
| `useMyLists()` / `useList(id)`                          |   ✅   | My lists; one list + items + current role (`missing` for no access)                           |
| `useTitleSearch(query)`                                 |   ✅   | Debounced movie + series search for the "Add titles" picker                                   |
| `usePlans()` / `usePlanner(month)` / `useUpcoming()`    |   ✅   | Mine + shared plans; sessions of the month grid and today; today + tomorrow for Home/header   |
| `useDashboardPlans()`                                   |   ✅   | Plans + all their sessions (one listener per plan, no range) for the dashboard                |
| `usePlan(id)` / `usePlanActions()`                      |   ✅   | One plan + sessions + role (`missing` for no access); complete, skip, undo, reschedule        |
| `usePlanSource(pick)`                                   |   ✅   | Episodes of a series or movies of a list for the stepper (aborts on change)                   |
| `useMediaQuery(query)`                                  |   ✅   | `matchMedia` via `useSyncExternalStore` (calendar / agenda switch)                            |
| `useDashboardStats(period)`                             |   ✅   | Library stats (selector), genres, plan stats per section with `status` and `retry`            |
| `useTheme()`                                            |   ✅   | Current value + setter                                                                        |
| `useTmdbLanguage()`                                     |   ✅   | TMDB code of the UI language (`ru-RU`), part of every request key                             |
| `useNotifications()`                                    |   ✅   | Live notifications of the verified email, `unread`, `markRead`, `markAllRead`, `decline`      |
| `useOnlineStatus()`                                     |   ✅   | `true` / `false` from `online` / `offline` events                                             |
