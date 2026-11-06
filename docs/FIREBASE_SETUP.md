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
react-movietime.vercel.app
```

`localhost` and `<project-id>.firebaseapp.com` are there by default. Without the production
domain, Google sign-in on the deployed site fails with `auth/unauthorized-domain`.

Vercel preview deployments get random domains, so Google sign-in only works on production and
on localhost. Email/password works everywhere.

**Why popup and not redirect:** `signInWithRedirect` relies on third-party storage between the
app domain and `*.firebaseapp.com`, which modern browsers block when the app isn't on Firebase
Hosting. `signInWithPopup` doesn't have this problem.

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
`VITE_TMDB_TOKEN` for Production, Preview and Development, then **redeploy**. Vite inlines
`VITE_*` variables at build time, so an old build doesn't see new values.

## 7. Checklist

- [ ] Project created, web app registered
- [ ] `.env.local` filled
- [ ] Email/Password enabled
- [ ] Google enabled, support email set
- [ ] `react-movietime.vercel.app` in authorized domains
- [ ] Firestore created in production mode
- [ ] Rules and indexes deployed
- [ ] Env variables in Vercel, redeployed
- [ ] Sign up, sign in with Google, sign out on the deployed site
