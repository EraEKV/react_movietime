# Firebase Setup

Step-by-step configuration of the Firebase project used by Movietime. The free **Spark** plan
is enough: Authentication, Firestore and security rules don't need billing.

## 1. Create the project

1. Open https://console.firebase.google.com → **Add project**.
2. Name it (for example `movietime`). Google Analytics is optional; the app doesn't use it.

## 2. Register the web app

1. **Project settings** (gear icon) → **Your apps** → **Web** (`</>`).
2. App nickname: `movietime-web`. **Don't** enable Firebase Hosting; the app is hosted on Vercel.
3. Copy the values from the `firebaseConfig` object into `.env.local`:

   ```bash
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=        # <project-id>.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   VITE_FIREBASE_MEASUREMENT_ID=     # optional, only for Google Analytics (not used)
   ```

The web config is **not a secret**: it identifies the project and ends up in the client bundle
anyway. Data is protected by the security rules (step 5), not by hiding the key.

## 3. Authentication

**Build → Authentication → Get started → Sign-in method:**

1. **Email/Password** → Enable → Save. (Leave "Email link" off.)
2. **Google** → Enable → choose a project support email → Save.

**Authentication → Settings → Authorized domains:** add the production domain:

```
avleron.com
```

`localhost` and `<project-id>.firebaseapp.com` are there by default. Without the production
domain, Google sign-in on the deployed site fails with `auth/unauthorized-domain`.

Preview deployments get random domains, so Google sign-in only works on production and on
localhost. Email/password works everywhere.

**Popup on desktop, redirect on phones and in the installed app.** A popup in an installed
iPhone app is blocked or opens inside the app without an account chooser, so phones and the
installed app use `signInWithRedirect`. Redirect relies on third-party storage between the app
domain and `*.firebaseapp.com`, which browsers block unless both are the same site. The fix is
Firebase's "proxy" option: the Cloudflare Worker (`worker/index.ts`, `run_worker_first` in
`wrangler.jsonc`) forwards `/__/*` to `FIREBASE_AUTH_HOST` (`<project-id>.firebaseapp.com`), and
the app uses its own domain as `authDomain`. On `avleron.com` the app takes that value from the
page's own host (`src/utils/authDomain.ts`), so it does not depend on the build variable.
Setup for production:

1. **Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client IDs** (the "Web
   client (auto created by Google Service)"): under **Authorized redirect URIs** add
   `https://avleron.com/__/auth/handler` (keep the existing
   `https://<project-id>.firebaseapp.com/__/auth/handler`).
2. **Firebase → Authentication → Settings → Authorized domains** lists `avleron.com`.
3. Keep `/__/*` out of any Cloudflare rule that challenges or blocks (Managed Challenge, Bot
   Fight Mode, Rocket Loader, Email Obfuscation, Browser Integrity Check): the handler page must
   reach the browser untouched. `https://avleron.com/__/auth/handler` should show a plain
   Firebase page, not the app.
4. `VITE_FIREBASE_AUTH_DOMAIN` is only used off the production domain (localhost keeps
   `<project-id>.firebaseapp.com`). `www.avleron.com` has no redirect URI registered: redirect it to
   `avleron.com` in Cloudflare.

If a phone sign-in ends with "Google sign-in didn't finish", the browser console shows
`Google redirect returned without a user` with the host and `authDomain` it ran with.

**Optional, Authentication → Templates:** set the sender name and the email verification /
password reset texts.

## 4. Firestore

1. **Build → Firestore Database → Create database**.
2. Location: `eur3 (europe-west)` or the nearest region. **This can't be changed later.**
3. Start in **production mode** (everything denied until rules are deployed).

## 5. Security rules and indexes

The rules live in the repo: `firestore.rules` and `firestore.indexes.json`
(their content is described in [DATA_MODEL.md](DATA_MODEL.md#security-rules)).

**Option A, console:** Firestore → **Rules** → paste `firestore.rules` → Publish.
Indexes: when a query needs one, the browser console shows an error with a direct link that
creates it.

**Option B, Firebase CLI (recommended, keeps the console in sync with the repo):**

```bash
npm i -g firebase-tools
firebase login
firebase use --add                     # pick the project
firebase deploy --only firestore       # rules + indexes
```

Test the rules in **Firestore → Rules → Rules Playground** before publishing: for example,
try reading `/lists/<id>` as another user and as a guest.

### Local emulators (development only)

The Auth and Firestore emulators run the same `firestore.rules` locally, with throwaway data:

```bash
# Java 21+ must be installed (the Firestore emulator is a Java program)
npm run emulators                       # Auth :9099, Firestore :8180, project demo-movietime
VITE_USE_EMULATORS=true npm run dev     # the dev app talks to the emulators, not to Firebase
```

`VITE_USE_EMULATORS` works only in `npm run dev` (`import.meta.env.DEV`); production builds drop
the emulator code. Rule changes reload in the emulator without a restart. The emulator doesn't
require composite indexes, so `firebase deploy --only firestore:indexes` is still needed for
the real project.

Shared access needs a **verified** email. In the Auth emulator no email is sent: the
verification links are kept in its outbox and work when opened.

```bash
# after "Send verification email" in the app (or accounts:sendOobCode via REST):
curl -s http://127.0.0.1:9099/emulator/v1/projects/demo-movietime/oobCodes
# open the "oobLink" of the VERIFY_EMAIL entry, then press "I've verified" in the app
```

To try roles by hand, use three verified accounts in three browser profiles (or one normal and
one private window per account): the owner invites the others as editor and viewer, then turns
the link on and opens it in a window without an account.

## 6. Vercel

**Project → Settings → Environment Variables:** add every `VITE_FIREBASE_*` variable and
`TMDB_TOKEN` (the TMDB read access token, server only: the `api/tmdb` function adds it to
requests, so it never reaches the browser) for Production, Preview and Development, then
**redeploy**. Vite inlines `VITE_*` variables at build time, so an old build doesn't see new
values. An existing `VITE_TMDB_TOKEN` keeps working as a fallback for the function.

## 7. Email (Resend)

Invitations, role-change notices and the welcome email are sent by Vercel functions in
`api/` through [Resend](https://resend.com). The browser never sees the key.

1. In Resend, add your domain (**Domains → Add domain**) and put the SPF and DKIM records it
   shows into your DNS. Until the domain is **Verified**, Resend delivers only to the owner of
   the Resend account.
2. Create an API key (**API Keys**, sending access).
3. In Vercel add `RESEND_API_KEY` and `RESEND_FROM` (for example
   `Movietime <invites@avleron.com>`, an address on the verified domain), then redeploy. The
   functions also read `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_PROJECT_ID`, which are already
   there for the build.
4. Deploy the rules again (`firebase deploy --only firestore:rules`): `users/{uid}` gained the
   optional `welcomedAt` field.

The functions verify the caller's Firebase ID token and read Firestore with it, so the
security rules apply: invites and role-change notices go only to members of a list or plan the
caller owns, and the welcome email only to the caller's own verified address. `npm run dev`
serves `api/` too (`vite.dev-api.ts` runs the same handlers as Vercel, with the server-side keys
from `.env.local`); `/api/tmdb` stays with the dev proxy.

## 8. Push notifications

A friend gets a push (even with Movietime closed) when you share a list or plan with them or
change their role. Each person turns it on in **Settings → Notifications**; the browser asks for
permission only then.

1. Keys: `npx web-push generate-vapid-keys`. Put the public key in `VITE_VAPID_PUBLIC_KEY` (it is
   inlined into the build, so redeploy) and the private key in `VAPID_PRIVATE_KEY`. Also set
   `VAPID_SUBJECT` (`mailto:invites@avleron.com`).
2. Subscriptions are stored in `pushSubscriptions/{id}`, a collection no client can read (see
   `firestore.rules`): only the server may look up someone else's browsers. The server therefore
   needs **Firebase Admin**: Firebase console → Project settings → Service accounts → _Generate
   new private key_, then paste the whole JSON, as one line, into the Vercel variable
   `FIREBASE_SERVICE_ACCOUNT`. Never commit this file.
3. Deploy the rules again and redeploy the app.

Notes: it works only on the deployed site (https) with the service worker registered, not under
`npm run dev`. On iPhone and iPad push needs the app added to the Home Screen (iOS 16.4+). A
subscription that the browser reports as gone (404/410) is deleted on the next push.

## 9. Checklist

- [ ] Project created, web app registered
- [ ] `.env.local` filled
- [ ] Email/Password enabled
- [ ] Google enabled, support email set
- [ ] `avleron.com` in authorized domains
- [ ] Firestore created in production mode
- [ ] Rules and indexes deployed
- [ ] Env variables in Vercel, redeployed
- [ ] VAPID keys and `FIREBASE_SERVICE_ACCOUNT` in Vercel (push), rules deployed
- [ ] Resend domain verified, `RESEND_API_KEY` and `RESEND_FROM` in Vercel
- [ ] Sign up, sign in with Google, sign out on the deployed site
