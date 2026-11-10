# Data Model

Movietime uses two backends:

- **TMDB API** (read-only): the catalog of movies and TV series. This is the primary entity.
- **Cloud Firestore**: user data, i.e. profiles, library, lists, plans and sessions.

Guests (not signed in) keep their library and preferences in `localStorage`.

```
TMDB title ──(media key)──► library entry      users/{uid}/library/{mediaKey}
     │                       list item          lists/{listId}/items/{mediaKey}
     │                       plan.media         plans/{planId}
     └── seasons/episodes ─► sessions           plans/{planId}/sessions/{sessionId}
```

## Conventions

- **Media key**: `${mediaType}_${tmdbId}`, where `mediaType` is `"movie"` or `"tv"`.
  Example: `tv_1396`. Used as the document id for library entries and list items, so
  duplicates are impossible.
- **Emails** are stored lowercase.
- **Dates**: points in time are Firestore `Timestamp` (`serverTimestamp()` on write).
  Calendar days are strings `"YYYY-MM-DD"` in the user's local time zone, and times of day are
  `"HH:mm"`. A calendar day is not a moment in time, and strings sort and compare correctly in
  queries.
- Every document written by the app has `createdAt` / `updatedAt` where it makes sense.
- The schemas below are also defined as TypeScript types in `src/types/` and used by the
  services, so a wrong field name is a compile error.

## TMDB resources

| Resource        | Endpoint                                                                            | Used for                             |
| --------------- | ----------------------------------------------------------------------------------- | ------------------------------------ |
| Discover movies | `GET /discover/movie`                                                               | Movie catalog: filters, sort, paging |
| Discover series | `GET /discover/tv`                                                                  | Series catalog                       |
| Search          | `GET /search/movie`, `GET /search/tv`                                               | Debounced title search               |
| Movie details   | `GET /movie/{id}?append_to_response=credits,videos,recommendations,watch/providers` | Movie page                           |
| Series details  | `GET /tv/{id}?append_to_response=credits,videos,recommendations,watch/providers`    | Series page                          |
| Seasons (batch) | `GET /tv/{id}?append_to_response=season/1,…,season/20`                              | Heatmap, planner episode list        |
| Genres          | `GET /genre/movie/list`, `GET /genre/tv/list`                                       | Filter options, genre names          |
| Languages       | `GET /configuration/languages`                                                      | Original language filter             |
| Trending        | `GET /trending/{movie,tv}/week`                                                     | Home page                            |

All requests send `language` (`en-US` / `ru-RU` / `kk-KZ`) from the current UI language.

### Catalog query parameters (app URL → TMDB)

| App URL param | Movies                            | Series                   | Values                                         |
| ------------- | --------------------------------- | ------------------------ | ---------------------------------------------- |
| `q`           | `/search/movie?query=`            | `/search/tv?query=`      | text                                           |
| `genre`       | `with_genres`                     | `with_genres`            | genre id                                       |
| `year`        | `primary_release_year`            | `first_air_date_year`    | 1950…current year                              |
| `rating`      | `vote_average.gte`                | `vote_average.gte`       | 5–9                                            |
| `lang`        | `with_original_language`          | `with_original_language` | ISO 639-1 (`en`, `ko`…)                        |
| `runtime`     | `with_runtime.lte`                | —                        | 90 / 120 / 150                                 |
| `status`      | —                                 | `with_status`            | 0, 2, 3, 4                                     |
| `sort`        | `sort_by`                         | `sort_by`                | popular, top-rated, most-voted, newest, oldest |
| `page`        | `page`                            | `page`                   | 1–500                                          |
| `size`        | number of TMDB pages per app page | same                     | 20, 40, 60                                     |

Unknown or invalid values in the URL are dropped and replaced by defaults.

### Title (normalized from TMDB)

TMDB returns different field names for movies and series (`title` / `name`,
`release_date` / `first_air_date`). `utils/media.ts` normalizes both into one shape for cards
and for the snapshots stored in Firestore:

```ts
export type MediaType = 'movie' | 'tv'

export interface MediaSummary {
  mediaType: MediaType
  tmdbId: number
  title: string
  posterPath: string | null
  year: string | null // "2008"
  genreIds: number[]
  tmdbRating: number | null // 0–10
}
```

## Firestore collections

### `users/{uid}`: profile

| Field               | Type                            | Notes                                                                                                                     |
| ------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `displayName`       | string                          | 1–40 chars                                                                                                                |
| `email`             | string                          | lowercase, from Auth                                                                                                      |
| `photoURL`          | string \| null                  | Google avatar                                                                                                             |
| `avatar`            | map \| absent                   | The avatar chosen in settings: `{ kind: "emoji", emoji, color }` or `{ kind: "photo", photo }` (see below)                |
| `providers`         | string[]                        | `["password"]`, `["google.com"]`                                                                                          |
| `settings.theme`    | `"light" \| "dark" \| "system"` |                                                                                                                           |
| `settings.language` | `"en" \| "ru" \| "kk"`          |                                                                                                                           |
| `createdAt`         | Timestamp                       |                                                                                                                           |
| `updatedAt`         | Timestamp                       |                                                                                                                           |
| `welcomedAt`        | Timestamp \| absent             | Set once the welcome email is sent                                                                                        |
| `icsToken`          | string \| absent                | 32 URL-safe characters (192 random bits): the secret in the calendar subscription link; absent until the user creates one |
| `icsTimeZone`       | string \| absent                | IANA name of the device that made the link (`Asia/Almaty`); sessions are wall-clock times, so the feed needs it           |

`avatar` wins over the Google `photoURL`, which wins over the initials. `emoji` is 1–16 characters
and `color` one of `default`, `plan-1` … `plan-6` (the design system's plan tokens, shown as a tint
of the colour on the surface). `photo` is a 256 × 256 square cropped in the app, written as a
`data:image/webp;base64,…` (or `jpeg`) URL of at most 40 000 characters, around 10–20 KB, so no
storage bucket is needed. Only the signed-in user sees their own avatar: lists and plans store
names and emails, so other people see initials.

Created on first sign-in (`ensureProfile`). `settings` is written from the device only when the
account has none; afterwards the account wins and a listener applies it on every device
(guests keep preferences in `localStorage` only). `localStorage` stays the first-paint cache.
The settings page changes `displayName` (also in Firebase Auth) and `settings`, and creates, replaces or
removes the calendar link (`icsToken` + `icsTimeZone`). `GET /api/calendar/<icsToken>.ics`
(`api/ics.ts`, Firebase Admin, no sign-in) finds the owner by that field and returns every
pending session of the user's plans, and of plans shared with a verified email, as an iCalendar
feed with `TZID` times. A new token cancels the old link; there is no other way to the feed.

### `pushSubscriptions/{sha256(endpoint)}`: push subscription

One document per browser that turned push on (Settings → Notifications). Written and read only by
the server (Firebase Admin, `api/push*.ts`); the rules deny every client, because the document
ties an email to a browser.

| Field          | Type                   | Notes                                                 |
| -------------- | ---------------------- | ----------------------------------------------------- |
| `uid`          | string                 | Who subscribed; only they can remove it               |
| `email`        | string                 | Verified, lowercase; how a sender finds the recipient |
| `locale`       | `"en" \| "ru" \| "kk"` | Language of the notification text                     |
| `subscription` | `{ endpoint, keys }`   | The browser's `PushSubscription`                      |
| `createdAt`    | Timestamp              |                                                       |

### `users/{uid}/library/{mediaKey}`: library entry

| Field                                                                          | Type                                               | Notes                                                                          |
| ------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------ |
| `mediaType`, `tmdbId`, `title`, `posterPath`, `year`, `genreIds`, `tmdbRating` | `MediaSummary`                                     | Snapshot so lists render without TMDB                                          |
| `runtime`                                                                      | number \| null                                     | Movie runtime or average episode runtime, minutes                              |
| `totalEpisodes`                                                                | number \| null                                     | Series only                                                                    |
| `status`                                                                       | `"plan" \| "watching" \| "completed" \| "dropped"` |                                                                                |
| `score`                                                                        | number (1–10) \| null                              |                                                                                |
| `notes`                                                                        | string                                             | ≤ 500 chars                                                                    |
| `progress`                                                                     | `{ season, episode, watchedEpisodes }` \| null     | Series only; last watched episode                                              |
| `addedAt`                                                                      | Timestamp                                          |                                                                                |
| `updatedAt`                                                                    | Timestamp                                          |                                                                                |
| `completedAt`                                                                  | Timestamp \| null                                  | Set when status becomes `completed`                                            |
| `order`                                                                        | number \| null                                     | Place in the user's own order ("My order" sort); written by drag-and-drop only |

Guests: the same objects in `localStorage` under `movietime.library.v1`.

### `users/{uid}/activity/{activityId}`: activity log

Append-only, shown on the profile page (newest 20, `orderBy('createdAt', 'desc')`). Library
and list records are written without `await`, so a failed log never fails the action itself;
planner records are part of the planner's batch. Rules (`validActivity`): only these fields,
`type` from the list below, `title` 1–200, `createdAt == request.time`; no updates or deletes.

| Field       | Type      | Example                                                                                    |
| ----------- | --------- | ------------------------------------------------------------------------------------------ |
| `type`      | string    | `library.add`, `library.status`, `list.create`, `plan.create`, `session.done`, `plan.done` |
| `mediaKey`  | string?   | `tv_1396`                                                                                  |
| `title`     | string    | "Breaking Bad"                                                                             |
| `refId`     | string?   | list or plan id                                                                            |
| `meta`      | map?      | `{ episodes: "S2E3–E4" }`                                                                  |
| `createdAt` | Timestamp |                                                                                            |

### `lists/{listId}`: list (secondary entity)

Top-level, not under `users/`, because lists are shared between users.

| Field                    | Type                               | Notes                                                  |
| ------------------------ | ---------------------------------- | ------------------------------------------------------ |
| `ownerUid`               | string                             |                                                        |
| `ownerName`              | string                             | Shown to people the list is shared with                |
| `name`                   | string                             | 1–60 chars                                             |
| `description`            | string                             | ≤ 300 chars                                            |
| `emoji`                  | string                             | Cover, for example "🍿"                                |
| `visibility`             | `"private" \| "link"`              | `link` = anyone with the URL can read                  |
| `roles`                  | map `email → "editor" \| "viewer"` | Members (the owner isn't listed here)                  |
| `memberEmails`           | string[]                           | Keys of `roles`, for `array-contains` queries          |
| `itemCount`              | number                             | Updated with `increment()` in the same batch as items  |
| `covers`                 | string[] (≤ 4)                     | Poster paths of the newest items, for the card collage |
| `createdAt`, `updatedAt` | Timestamp                          |                                                        |

### `lists/{listId}/items/{mediaKey}`: list item

| Field                 | Type            | Notes                  |
| --------------------- | --------------- | ---------------------- |
| `MediaSummary` fields |                 | Snapshot               |
| `note`                | string          | ≤ 200 chars            |
| `position`            | number          | Manual order           |
| `addedBy`             | `{ uid, name }` | Useful in shared lists |
| `addedAt`             | Timestamp       |                        |

### `plans/{planId}`: watch plan (business feature)

| Field                                 | Type                                                                           | Notes                                                                                                                                                                                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ownerUid`, `ownerName`               | string                                                                         |                                                                                                                                                                                                                                                |
| `title`                               | string                                                                         | "Breaking Bad — season 2"                                                                                                                                                                                                                      |
| `kind`                                | `"series" \| "list" \| "movie"`                                                | A series, the movies of a list, or one movie on one evening (one unit, one session, `media` null)                                                                                                                                              |
| `media`                               | library media snapshot \| null                                                 | When `kind = "series"`                                                                                                                                                                                                                         |
| `sourceListId`                        | string \| null                                                                 | When `kind = "list"`: a list id, `collection:<tmdb id>` for a marathon planned from a collection, or `person:<tmdb id>` for a director's marathon (the movies they directed that are out, oldest first, short films under 40 minutes left out) |
| `options`                             | `{ startDate, weekdays, time, times?, perSession, from: { season, episode } }` | `weekdays`: 0 = Sun … 6 = Sat; `time`: the usual start; `times`: optional `{ weekday: "HH:mm" }` for days with their own start (Friday 22:30)                                                                                                  |
| `color`                               | number 1–6                                                                     | `--plan-N` token, in creation order                                                                                                                                                                                                            |
| `totalUnits`                          | number                                                                         | Episodes or movies in the plan                                                                                                                                                                                                                 |
| `doneUnits`                           | number                                                                         |                                                                                                                                                                                                                                                |
| `totalMinutes`                        | number                                                                         |                                                                                                                                                                                                                                                |
| `nextDate`                            | string \| null                                                                 | Next pending session day, for sorting                                                                                                                                                                                                          |
| `endDate`                             | string                                                                         | Last session day                                                                                                                                                                                                                               |
| `status`                              | `"active" \| "done" \| "archived"`                                             |                                                                                                                                                                                                                                                |
| `visibility`, `roles`, `memberEmails` |                                                                                | Same as lists                                                                                                                                                                                                                                  |
| `createdAt`, `updatedAt`              | Timestamp                                                                      |                                                                                                                                                                                                                                                |

### `plans/{planId}/sessions/{sessionId}`: session

| Field     | Type                                                              | Notes                       |
| --------- | ----------------------------------------------------------------- | --------------------------- |
| `index`   | number                                                            | Order inside the plan       |
| `date`    | string `"YYYY-MM-DD"`                                             |                             |
| `time`    | string `"HH:mm"`                                                  |                             |
| `units`   | `{ mediaKey, title, season, episode, ordinal, runtime, media }[]` | 1–10 episodes, or one movie |
| `minutes` | number                                                            | Sum of runtimes             |
| `status`  | `"pending" \| "done" \| "skipped"`                                |                             |
| `doneAt`  | Timestamp \| null                                                 |                             |
| `doneBy`  | `{ uid, name }` \| null                                           | Who marked (or skipped) it  |
| `copyOf`  | string \| null                                                    | Set on the copy a skip adds |

Unit fields: `season` / `episode` are `null` for movies; `ordinal` is the episode's position in
the series (regular seasons, the same count as library `progress.watchedEpisodes`); `media` is
the movie's snapshot for the library (null for episodes, the plan's `media` covers the series).
Specials (season 0), episodes without an air date and episodes airing after today are never
planned. Series in a list are left out of a movie marathon.

A plan is written with a batch. One Firestore batch holds at most 500 writes, so a large plan
(for example a 900-episode series at 1 episode per session) is written in chunks of 400 writes.
The first chunk holds the plan, the library entries, the activity record and the first
sessions; session rules check the plan with `getAfter()`, which sees it as it will be after the
batch, so the plan and its sessions can be created together.

### `plans/{planId}/likes/{sessionId}_{uid}`: 👍 on a marathon film

Movie marathons only (`kind = "list"`). The id holds the person, so one person has one like per
session.

| Field       | Type      | Notes                                                                   |
| ----------- | --------- | ----------------------------------------------------------------------- |
| `sessionId` | string    | The session the film sits in                                            |
| `uid`       | string    | Who liked                                                               |
| `name`      | string    | Their display name                                                      |
| `mediaKey`  | string    | The film at the time: after a reorder or a swap the like stops counting |
| `createdAt` | Timestamp |                                                                         |

### `plans/{planId}/proposals/{sessionId}_{uid}`: film suggestion

A member suggests another film for a pending session; the owner accepts or rejects. One open
suggestion per person per session (a new one replaces the old).

| Field       | Type                                    | Notes                                                         |
| ----------- | --------------------------------------- | ------------------------------------------------------------- |
| `sessionId` | string                                  |                                                               |
| `by`        | `{ uid, name }`                         | The author                                                    |
| `unit`      | unit                                    | The suggested film (same shape as a session unit, a movie)    |
| `replaces`  | string                                  | `mediaKey` of the film it was made against; stale if it moved |
| `status`    | `"pending" \| "accepted" \| "rejected"` | Only the owner changes it                                     |
| `createdAt` | Timestamp                               |                                                               |
| `decidedAt` | Timestamp \| null                       |                                                               |

### `notifications/{notificationId}`: in-app notification

Written by the owner in the same batch as the sharing change; read by the person whose
verified email equals `toEmail`. No account lookup: if nobody has that email yet, the document
waits.

| Field         | Type              | Notes                                          |
| ------------- | ----------------- | ---------------------------------------------- |
| `toEmail`     | string            | lowercase                                      |
| `type`        | string            | `shared` (only type so far)                    |
| `collection`  | string            | `lists` or `plans`                             |
| `targetId`    | string            | list or plan id                                |
| `targetTitle` | string            | 1–120, the name when the invite was sent       |
| `role`        | string            | `editor` or `viewer`                           |
| `fromUid`     | string            | must equal the writer                          |
| `fromName`    | string            | ≤ 80                                           |
| `createdAt`   | Timestamp         | `request.time`                                 |
| `readAt`      | Timestamp \| null | `null` on create; set once when marked as read |

Rules (`validNotification`): create only if the batch really adds `toEmail` with this `role`
to the target (`getAfter`), the writer owns the target, and `toEmail` was not a member before;
known fields only. Read and delete: verified email equals `toEmail`. Update: only `readAt`,
from `null` to `request.time`. Query: `where toEmail == me orderBy createdAt desc limit 30`.

### `notifications/{notificationId}`: marathon suggestion notice

A second kind of notification, addressed by `toUid` (a plan holds the owner's uid, not their
email). Written in the same batch as the suggestion (`proposal`: a member tells the owner) or
the owner's answer (`answer`: the owner tells the author). Likes send nothing.

| Field                                        | Type   | Notes                                                               |
| -------------------------------------------- | ------ | ------------------------------------------------------------------- |
| `toUid`                                      | string | the plan's owner (`proposal`) or the suggestion's author (`answer`) |
| `type`                                       | string | `proposal` or `answer`                                              |
| `collection`                                 | string | `plans`                                                             |
| `targetId`                                   | string | plan id                                                             |
| `proposalId`                                 | string | `proposals/{sessionId}_{uid}` of that plan                          |
| `targetTitle`                                | string | must equal the plan's title                                         |
| `film`                                       | string | must equal the suggested film's title                               |
| `decision`                                   | string | `accepted` or `rejected`, only on `answer`                          |
| `fromUid`, `fromName`, `createdAt`, `readAt` |        | as above                                                            |

Rules (`validProposalNotice`): create only if the suggestion (or its answer) is really in the
batch (`getAfter`): a `proposal` from a member of the plan, pending, addressed to the owner;
an `answer` from the owner, for a suggestion that was pending before, `decision` equal to its
new status, addressed to its author. Read, delete and mark read: `toUid == me`. Query:
`where toUid == me orderBy createdAt desc limit 30` (index `toUid` + `createdAt`).

## Business operations

| Operation           | Writes (one batch)                                                                                                                                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create plan         | `plans/{id}` + N `sessions` + library upsert (series → `watching`; marathon movies not in the library → `plan`) + activity `plan.create`                                                                                                          |
| Complete session    | session `done` + `doneBy` · plan `doneUnits`, `nextDate`, `endDate`, `status` · **the marker's own** library (series progress, only forward; `completed` when the plan finishes; a movie → `completed`) · activity `session.done` (+ `plan.done`) |
| Undo                | session back to `pending` · for a skip, its pending copy is deleted · plan counters. Library progress is not rolled back                                                                                                                          |
| Reschedule session  | session `date` (+ every later pending session shifted by the same days) · plan `nextDate`, `endDate`                                                                                                                                              |
| Reorder films       | pending sessions of a `list` plan swap their `units` and `minutes` (dates and times stay); plan counters are unchanged. Owner and editor                                                                                                          |
| Like a film         | `likes/{sessionId}_{uid}` set or deleted. Owner, editor and viewer of a movie marathon                                                                                                                                                            |
| Suggest a film      | `proposals/{sessionId}_{uid}` set (pending), or deleted by the author. Owner, editor and viewer of a movie marathon                                                                                                                               |
| Answer a suggestion | owner only: proposal `accepted` / `rejected`; on accept the session's `units` and `minutes` swap and the plan's `totalMinutes` follows in the same batch, the session's likes are deleted and other open suggestions for it are rejected          |
| Skip session        | session `skipped` + `doneBy` · a copy with the same units (`copyOf`) on the next plan weekday after the last session · plan `endDate`                                                                                                             |
| Delete plan         | all sessions, likes and proposals, then the plan in the last batch (library entries stay)                                                                                                                                                         |
| Copy list           | new `lists/{id}` owned by the current user + copied items                                                                                                                                                                                         |

## Sharing and roles

The owner's access comes from `ownerUid`. Members are stored on the shared document itself:

```js
{
  ownerUid: "u_123",
  visibility: "link",                         // or "private"
  roles: { "dan@gmail.com": "editor", "aru@mail.ru": "viewer" },
  memberEmails: ["dan@gmail.com", "aru@mail.ru"]
}
```

- **Notifications:** adding a member also writes a `notifications` document (see above); the
  person is told in the app, and the invite link covers people without an account.
- **"Shared with me"** query: `where("memberEmails", "array-contains", myEmail)`.
- **Rules** read the signed-in user's email from the ID token (`request.auth.token.email`),
  so no invitation server is needed.
- Access by email requires `email_verified == true`. Otherwise anyone could register an
  email/password account with someone else's address and get their shared access. Google
  accounts are always verified; email/password users verify through the link sent at signup.
- The owner may change any field (validated by `validList()` / `validPlan()`); a list editor
  only `itemCount`, `covers` and `updatedAt` (adding or removing items), a plan editor only the
  progress fields `doneUnits`, `nextDate`, `endDate`, `status`, `updatedAt`.
- In a shared plan everyone keeps their own library: when an editor marks a session, the
  editor's library moves, never the owner's (rules only let a user write their own library).
- Link visibility (`visibility == "link"`) allows **read** for anyone, including guests.
  It never allows writes.

| Action                           | owner | editor | viewer | link visitor |
| -------------------------------- | :---: | :----: | :----: | :----------: |
| Read list / plan                 |   ✓   |   ✓    |   ✓    |      ✓       |
| Add / remove / edit list items   |   ✓   |   ✓    |        |              |
| Complete / reschedule sessions   |   ✓   |   ✓    |        |              |
| Rename, change visibility        |   ✓   |        |        |              |
| Add / remove members, roles      |   ✓   |        |        |              |
| Delete                           |   ✓   |        |        |              |
| Like / suggest a film (marathon) |   ✓   |   ✓    |   ✓    |              |
| Accept / reject a suggestion     |   ✓   |        |        |              |
| Leave                            |       |   ✓    |   ✓    |              |

## Security rules

Stored in the repo as `firestore.rules` with `firestore.indexes.json` and `firebase.json`
(added in phase 2). Deploy them with `firebase deploy --only firestore:rules` and
`firebase deploy --only firestore:indexes` (or `--only firestore` for both).

The block below is an **excerpt**: the helper functions and the structure of the access checks.
The field validators (`validLibraryEntry`, `validList`, `validListItem`, `validProfile`,
`validActivity`, `validNotification`, `validPlan`, `validSession`, `validDoneBy`) and the
profile, activity and notification rules
are only in [`firestore.rules`](../firestore.rules), which is the source of truth.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function uid() { return request.auth.uid; }
    function email() { return request.auth.token.email.lower(); }
    function verified() { return signedIn() && request.auth.token.email_verified == true; }

    function isOwner(doc) { return signedIn() && doc.ownerUid == uid(); }
    function isMember(doc) { return verified() && email() in doc.memberEmails; }
    function isEditor(doc) { return verified() && doc.roles.get(email(), '') == 'editor'; }
    function isPublic(doc) { return doc.visibility == 'link'; }
    function canRead(doc) { return isOwner(doc) || isMember(doc) || isPublic(doc); }

    function onlyChanges(keys) {
      return request.resource.data.diff(resource.data).affectedKeys().hasOnly(keys);
    }
    // A member removes only themselves from roles and memberEmails.
    function isLeaving() {
      let me = [email()].toSet();
      return isMember(resource.data)
        && onlyChanges(['roles', 'memberEmails', 'updatedAt'])
        && request.resource.data.memberEmails.toSet() == resource.data.memberEmails.toSet().difference(me)
        && request.resource.data.roles.keys().toSet() == resource.data.roles.keys().toSet().difference(me);
    }

    // Sharing fields as the owner writes them: roles and memberEmails describe the same
    // people, roles are only editor/viewer, at most 20 members, never the owner's own email.
    function validSharing(d) {
      return d.visibility in ['private', 'link']
        && d.roles is map
        && d.memberEmails is list
        && d.memberEmails.size() <= 20
        && d.roles.keys().toSet() == d.memberEmails.toSet()
        && d.roles.values().hasOnly(['editor', 'viewer'])
        && !(request.auth.token.get('email', '').lower() in d.memberEmails);
    }

    // ---------- private user data ----------
    match /users/{userId} {
      // validProfile: only known fields, displayName 1–40, settings.theme / settings.language
      // from their enums, updatedAt == request.time; createdAt is set once. No delete.
      allow read: if signedIn() && uid() == userId;
      allow create, update: if signedIn() && uid() == userId && validProfile();

      match /library/{mediaKey} {
        allow read, delete: if signedIn() && uid() == userId;
        // validLibraryEntry: only known fields, status/score/notes in range, and the
        // document id equals mediaType + "_" + tmdbId (see firestore.rules).
        allow create, update: if signedIn() && uid() == userId && validLibraryEntry(mediaKey);
      }
      match /activity/{activityId} {
        allow read: if signedIn() && uid() == userId;
        allow create: if signedIn() && uid() == userId && validActivity();
      }
    }

    // ---------- lists ----------
    match /lists/{listId} {
      // get = one document by id (a shared link works for anyone); list = queries, only for
      // owners and members, so nobody can enumerate every public list.
      allow get: if canRead(resource.data);
      allow list: if isOwner(resource.data) || isMember(resource.data);
      // validList: known fields only, name 1–60, description ≤ 300, itemCount ≥ 0, ≤ 4 covers,
      // and validSharing().
      allow create: if isOwner(request.resource.data) && validList()
        && request.resource.data.itemCount == 0;
      allow update: if (isOwner(resource.data)
                        && request.resource.data.ownerUid == resource.data.ownerUid
                        && validList())
                    || (isEditor(resource.data)
                        && onlyChanges(['itemCount', 'covers', 'updatedAt']))
                    || isLeaving();
      allow delete: if isOwner(resource.data);

      match /items/{mediaKey} {
        function list() { return get(/databases/$(database)/documents/lists/$(listId)).data; }
        function canEdit() { return isOwner(list()) || isEditor(list()); }
        allow read: if canRead(list());
        // validListItem: known fields only, note ≤ 200, id == mediaType + "_" + tmdbId.
        allow create, update: if canEdit() && validListItem(mediaKey);
        allow delete: if canEdit();
      }
    }

    // ---------- plans ----------
    // validPlan: known fields only, title 1–120, a series plan has `media`, a list plan
    // `sourceListId`, 1–7 weekdays, colour 1–6, 1–5000 units, validPlanProgress, validSharing.
    // validPlanProgress: 0 ≤ doneUnits ≤ totalUnits, nextDate null or a day, status enum.
    match /plans/{planId} {
      allow get: if canRead(resource.data);
      allow list: if isOwner(resource.data) || isMember(resource.data);
      allow create: if isOwner(request.resource.data) && validPlan()
        && request.resource.data.doneUnits == 0;
      allow update: if (isOwner(resource.data)
                        && request.resource.data.ownerUid == resource.data.ownerUid
                        && validPlan())
                    || (isEditor(resource.data)
                        && onlyChanges(['doneUnits', 'nextDate', 'endDate', 'status', 'updatedAt'])
                        && validPlanProgress(request.resource.data))
                    || isLeaving();
      allow delete: if isOwner(resource.data);

      match /sessions/{sessionId} {
        function plan() { return get(/databases/$(database)/documents/plans/$(planId)).data; }
        // getAfter(): the plan as it will be after the batch (created in the same batch).
        function planAfter() { return getAfter(/databases/$(database)/documents/plans/$(planId)).data; }
        function canEdit(p) { return isOwner(p) || isEditor(p); }
        allow read: if canRead(plan());
        // validSession: known fields, day "YYYY-MM-DD", time "HH:mm", 1–10 units, status enum.
        // validDoneBy: "marked by" names yourself, or stays as it was.
        allow create: if canEdit(planAfter()) && validSession() && validDoneBy(null);
        // units stay, except a pending session of a movie marathon (kind 'list') may
        // swap its single film for another one: reordering the films.
        allow update: if canEdit(planAfter()) && validSession() && validDoneBy(resource.data)
          && request.resource.data.index == resource.data.index
          && (request.resource.data.units == resource.data.units
              || (planAfter().kind == 'list' && both pending && one unit each));
        // The owner deletes; an editor only the copy a skip added (Undo).
        allow delete: if isOwner(plan())
          || (isEditor(plan()) && resource.data.get('copyOf', null) != null);
      }
    }
  }
}
```

Notes:

- **Rules are not filters.** A query must only ask for documents the user may read, otherwise
  the whole query is rejected. The app always queries lists and plans with
  `where("ownerUid", "==", uid)` or `where("memberEmails", "array-contains", email)`.
- A link visitor opens one document by id (`getDoc` / `onSnapshot` on the doc). Queries are
  a separate `list` permission (owner or member only), so a query like
  `where("visibility", "==", "link")` is rejected: public lists can't be enumerated.
- A link visitor can read the whole list document, `memberEmails` included. The UI shows
  member names only to the owner and members, but the emails are not secret from someone who
  has the link. Turn the link off for lists shared with people who mind.
- **Copy list** is two steps: create the new list (rules require `itemCount == 0` on create),
  then items in batches with `itemCount: increment(n)`. One batch can't do both, because item
  rules read the list with `get()`, which sees the state before the batch.
- Leaving is the same write as removing a member; `isLeaving()` accepts it from a non-owner
  only if the one email removed is their own.
- `get()` inside sub-collection rules costs one extra read per request; that's fine at this
  scale. In a batch, `get()` sees the state before the batch, so a list and its items can be
  deleted together.
- Items of a missing list are unreadable (`canRead` of a missing document is false), so the
  list page asks for items only after the list itself arrived.
- The rules are exercised against the local emulator (see FIREBASE_SETUP.md) with verified
  owner, editor, viewer and stranger accounts, an unverified member and a guest: editor adds and
  removes titles but can't rename, share or delete; viewer and stranger can't write; the
  unverified member is a stranger; a guest reads by link only; members leave only themselves;
  invalid sharing (mismatched roles, unknown role, own email, 21 members) is rejected.
- Plans have their own emulator run: the owner creates a plan with its sessions, library entry
  and activity in one batch; invalid plans and sessions are rejected; an editor marks, skips,
  undoes and moves sessions and writes only their own library; an editor can't name someone
  else in "marked by", change what a session contains, rename, re-share or delete; viewers,
  unverified members, strangers and guests can't write; a guest reads plan and sessions by link
  only; members leave on their own; the owner deletes the plan with its sessions.

## Composite indexes

Stored in `firestore.indexes.json`.

| Collection      | Fields                                          | Query                |
| --------------- | ----------------------------------------------- | -------------------- |
| `lists`         | `ownerUid` ASC, `updatedAt` DESC                | My lists             |
| `lists`         | `memberEmails` ARRAY_CONTAINS, `updatedAt` DESC | Lists shared with me |
| `plans`         | `ownerUid` ASC, `nextDate` ASC                  | My plans             |
| `plans`         | `memberEmails` ARRAY_CONTAINS, `nextDate` ASC   | Plans shared with me |
| `notifications` | `toEmail` ASC, `createdAt` DESC                 | My notifications     |

Sessions are queried inside one plan by `date` (single-field index, created automatically).

## localStorage keys (guests)

| Key                        | Module                          | Content                                    |
| -------------------------- | ------------------------------- | ------------------------------------------ |
| `movietime.library.v1`     | `storage/libraryStorage.ts`     | Guest library entries                      |
| `movietime.preferences.v1` | `storage/preferencesStorage.ts` | `{ theme, language }`                      |
| `movietime.watchRegion.v1` | `storage/watchRegionStorage.ts` | Country for "Where to watch" (`US`)        |
| `movietime.watchlist.v1`   | (legacy, midterm)               | Migrated to the library once, then removed |

### Sessions that overlap

A session takes the time from `time` for `minutes` (a session without a length counts as two hours). Two pending sessions of any of the user's plans overlap when those windows intersect; windows that only touch do not. Nothing is stored: the planner computes it on the client (`utils/conflicts.ts`) from the sessions it already listens to, and only warns — a move is never blocked.
