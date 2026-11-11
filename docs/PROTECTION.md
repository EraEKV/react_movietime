# Protection against bots and scrapers

Avleron is a public site with a few paths that cost money or a quota every time they are called
(the TMDB proxy, mail, push, the calendar feed). This document says what is attacked, which
layers of defence there are, where each one lives (the repository or the Cloudflare dashboard)
and what is left open on purpose.

## What happened, and why it matters

On Vercel the free plan allows about one million "edge requests" a month, and the count went to
990 000 in a few weeks, mostly from crawlers. Two things made it worse:

- **The app made too many requests per visit.** The production build had 230 files; one view of
  the home page took about 82 requests and `/movies` about 113. A bot that loads pages (even
  without running scripts) multiplied that.
- **Nothing was cached.** Static files were answered with `max-age=0, must-revalidate`, so every
  visit asked the server about every file again.

The site now runs on Cloudflare Workers (`wrangler.jsonc`, `worker/index.ts`). Static files are
served by Cloudflare and are free and unlimited there; only calls that reach the Worker count
against the plan (100 000 a day on the free plan): `/api/*` and `/__/*`.

## Layers

| #   | Layer                    | Lives in                                     | What it does                                                                 |
| --- | ------------------------ | -------------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | Fewer, cacheable files   | `vite.config.ts`, `public/_headers`          | A page view costs ~16 requests instead of ~89 and a repeat view costs none   |
| 2   | Static files skip code   | `wrangler.jsonc` (`run_worker_first`)        | Only `/api/*` and `/__/*` reach the Worker; the rest is served by the edge   |
| 3   | TMDB proxy allow-list    | `api/_lib/tmdb.ts`                           | Answers only the requests the app makes; unknown parameters are dropped      |
| 4   | Edge cache for the proxy | `worker/cache.ts`                            | The same title or catalogue page is fetched from TMDB once per time window   |
| 5   | Authenticated endpoints  | `api/*.ts`, `api/_lib/firebase.ts`           | Mail, push and calendar need a Firebase token or a secret; bodies are capped |
| 6   | Firestore rules          | `firestore.rules`                            | User data is reachable only by its owner and members; nothing can be listed  |
| 7   | `robots.txt`             | `public/robots.txt`                          | Tells well-behaved crawlers to stay out of `/api/`                           |
| 8   | Cloudflare rules         | Cloudflare dashboard (not in the repository) | Rate limit, challenge and block rules in front of the Worker                 |

Layers 1 to 7 ship with the code. Layer 8 is configuration of the Cloudflare zone and has to be
repeated by hand when the site moves to another account or domain.

### 1. Fewer, cacheable files

- The Vite build groups the small shared modules into one chunk, so the app is 66 files instead
  of 230. The first view of the home page is about 16 requests instead of 89 (measured on the
  production build). Signed in, with Firestore and TMDB calls, a page view is about 60 requests
  (about 10 of them `fetch`).
- `public/_headers` gives every file under `/assets/` (names contain a content hash) a one-year
  `immutable` lifetime, dictionaries one day, icons a week. Only `index.html` and `sw.js` are
  revalidated, because they point at the current build.
- Fonts are served from the same origin (`@fontsource-variable/onest` and
  `@fontsource-variable/unbounded`, loaded by unicode range), so there is no request to Google
  Fonts and no third-party round trip.
- The service worker (`src/sw.ts`) precaches only the app shell and caches the rest the first
  time it is used, so a returning visitor makes very few network requests.

### 2. Static files never run code

`run_worker_first` in `wrangler.jsonc` lists only `/api/*` and `/__/*`. Everything else
(pages, scripts, images, dictionaries) is answered by Cloudflare's asset layer, with the
single-page fallback for deep links. Scraping the pages therefore costs nothing; scraping the API
is what the next layers handle.

### 3. The TMDB proxy answers only what the app asks

`/api/tmdb/*` adds our TMDB token to a request and forwards it, so it would be an open door to
the TMDB quota. `api/_lib/tmdb.ts` closes it:

- A path must match one of the shapes the app uses (`/discover/movie`, `/tv/<id>`,
  `/tv/<id>/season/<n>`, `/search/person`, and so on); ids are at most nine digits.
- Each path has a list of allowed query parameters, each with a pattern for its value (a page
  from 1 to 500, a date as `YYYY-MM-DD`, an `append_to_response` made of known words only).
  Unknown parameters are removed instead of forwarded.
- The cache key is built from the normalised path and sorted query, so `?x=1`, `?x=2` and a
  different parameter order cannot be used to dodge the cache or to spend the quota.
- Only `GET` is accepted. The token is added on the server and never reaches the browser.

### 4. Edge cache

`worker/cache.ts` stores each proxied answer in Cloudflare's cache under the normalised key, for
a time that depends on how fast the data changes (genres 7 days, one title, person or collection
6 hours, charts and catalogue pages 1 hour, search 10 minutes). The browser gets its own,
shorter lifetime, and the response carries `X-Cache: HIT` or `MISS`. A thousand requests for the
same page cost one call to TMDB. The Cache API stores nothing on `*.workers.dev`, only on a
custom domain, which is another reason to serve the site from `avleron.com`.

### 5. Authenticated endpoints

| Endpoint                                    | Who may call it                               | Limits                                                      |
| ------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------- |
| `/api/send-invite`, `/api/send-role-change` | A signed-in owner, for members they own       | Firebase ID token checked, body at most 8 KB                |
| `/api/send-welcome`                         | A signed-in user, for their own verified mail | Once per account (`welcomedAt`)                             |
| `/api/push`                                 | A signed-in user, for their own browsers      | At most 10 browsers per user, `429` after that              |
| `/api/push-notify`                          | The server flow after a share or role change  | Token shape checked, body capped, recipients from Firestore |
| `/api/calendar/<token>.ics`                 | Anyone who knows the secret token             | At most 100 plans per feed; a new link cancels the old one  |

The handlers read Firestore with the caller's own token, so the security rules apply to them as
well. `readJson` refuses a body above the cap before parsing it.

### 6. Firestore rules

The rules are the last line for user data (see `docs/DATA_MODEL.md`): a library is readable by
its owner only; a list or plan by its owner, its members and, if the owner turned the link on,
by whoever has the id. A query such as `where("visibility", "==", "link")` is rejected, so
public lists cannot be enumerated. Push subscriptions are in a collection no client can read.

### 7. robots.txt

`public/robots.txt` disallows `/api/`. It only stops crawlers that obey it, so it is a courtesy
and not protection.

### 8. Cloudflare rules (dashboard)

These are set under **Security → Security rules** (custom rules and rate limiting) of the
`avleron.com` zone. They are not stored in the repository, so the list below is the intended
configuration.

| Rule                               | Expression idea                                                                                                 | Action            |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------- | ----------------- |
| Rate limit on the API              | Path starts with `/api/`, not `cf.client.bot`; 30 requests per 10 seconds per IP                                | Block             |
| Challenge page navigations         | Not `/api/`, `/__/`, `/assets/`, `/locales/`, `/icons/`, `/sw.js`, manifest, `robots.txt`; not a known good bot | Managed Challenge |
| Known abusive networks and scripts | IP ranges that scan the site (for example `202.8.40.0/22`), and user agents of plain HTTP scripts               | Block             |

Rules of thumb:

- **Keep `/__/*` out of every challenge or block.** It serves Firebase's sign-in helper pages;
  a challenge there breaks Google sign-in on phones (see `docs/FIREBASE_SETUP.md`). Do the same
  for Bot Fight Mode, Rocket Loader, Email Obfuscation and Browser Integrity Check, which also
  rewrite or interrupt that path.
- **Block, do not challenge, XHR to `/api/`.** A challenge page cannot be shown to a `fetch`,
  so the app would just fail.
- **Do not challenge crawlers you want** (search engines, link previews). Use `cf.client.bot`
  to exclude verified bots; on the free plan the Bot Management fields are not available.
- Redirect `www.avleron.com` to `avleron.com`: the OAuth redirect URI is registered for the
  apex domain only.

## What can still be scraped

- **The catalogue.** Titles, posters and ratings come from TMDB and are public by licence. The
  proxy makes bulk scraping through us slow and cached, but a determined scraper can still ask
  TMDB directly. There is nothing secret to protect there.
- **Public pages of a list or plan** for someone who has the link. That is the point of the
  link.
- **Rotating IP addresses.** A per-IP rate limit does not stop a botnet. If one appears, tighten
  the challenge rule and look at the events (below).

## Watching it

- **Security → Events** in Cloudflare shows what each rule caught; sort by path and by country
  or network before writing a new rule.
- **Workers & Pages → the Worker → Metrics** shows invocations; a jump there means somebody is
  calling `/api/*` or `/__/*`.
- The Network tab of the browser dev tools is the quick check for request counts: a cold home
  page should be a few dozen requests and a repeat view almost none.
- If a quota alarm comes back: look at events first, block the network that shows up most,
  and only then tighten the rules for everybody.
