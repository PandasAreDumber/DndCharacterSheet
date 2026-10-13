# D&D Combat Tracker

A React and TypeScript character and combat tracker. Players can create multiple characters and choose one from the **Your characters** front page. Use **Characters** in the header to switch characters; each has its own combat state, spells, resources, and undo history. Character data stays in the browser for guest play. Google sign-in saves the account's characters in Cloud Firestore.

## Run locally

Use Node.js 20.19+ or 22.12+ and run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution is disabled.

## Connect Firebase

1. Create a Firebase project and register a **Web app** in the [Firebase console](https://console.firebase.google.com/). Copy its web configuration values.
2. In **Authentication → Sign-in method**, enable **Google**. In **Authentication → Settings → Authorized domains**, add `localhost` for local development if it is absent. Add every deployed site domain used for login.
3. Create a **Cloud Firestore** database. In **Firestore → Rules**, paste the contents of [`firestore.rules`](firestore.rules) and publish them. These rules allow a signed-in player to access only their own character path.
4. Copy `.env.example` to `.env.local` and fill in the three values from the Firebase web app configuration. Restart Vite after changing the file. For HTTPS sites, Auth uses the domain serving the app.
5. In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), open the OAuth web client used by Firebase Authentication's Google provider. Add `https://<your-domain>/__/auth/handler` to **Authorized redirect URIs** for each deployed site used for sign-in. For the HTTPS local setup below, also add `https://localhost:5173/__/auth/handler`. The scheme, host, port, and path must match exactly.
6. Start the app, choose **Log in with Google** from the account menu, and check **Settings → Account and cloud save** for the save status. Login first opens a Google popup. If the browser blocks the popup, the app switches to a full-page redirect.

Only the person running or deploying the build needs `.env.local`. Vite includes the Firebase web app configuration in the built JavaScript, so players only visit the site and sign in. This configuration identifies the Firebase project; the Firestore rules above protect each player's data.

Browser-only guest characters belong to the exact site address where they were created. Opening localhost will not show guest characters saved on a deployed `https://...` site. To move those characters into an empty account, deploy the updated sign-in version to the original site and sign in there using the same browser profile. After successful sign-in, the account menu says **Log out** and the character list loads account saves.

### Test Google sign-in locally

`npm run dev` serves ordinary HTTP localhost, even if a development certificate exists. Popup sign-in can work there. If the popup is blocked, Firebase's redirect flow uses a cross-origin auth helper on HTTP localhost, so browsers that block third-party storage may return without signing in. For testing the fallback without a local certificate warning, deploy this branch to a Vercel Preview URL. Add that exact preview domain to Firebase Authentication's **Authorized domains** and `https://<preview-domain>/__/auth/handler` to the Google OAuth web client's **Authorized redirect URIs**. Use the branch-specific preview URL, which stays stable across commits.

Local HTTPS remains optional. On Windows, run `powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\setup-local-https.ps1`, then `npm.cmd run dev:https` and open `https://localhost:5173/`. Vite proxies `/__/auth/*` to Firebase on the same origin. Its self-signed certificate shows a browser warning. The certificate and private key stay in Git-ignored `.local/`; never commit them.

### Deploying on Vercel

In the Vercel project, open **Settings → Environment Variables** and add the three `VITE_FIREBASE_*` values from `.env.example` for **Production** (and Preview if you use preview deployments). Redeploy after adding or changing them. Players do not need these variables or an `.env` file.

[`vercel.json`](vercel.json) forwards `/__/auth/*` to this Firebase project's auth helper without changing the URL in the browser. **If you change Firebase projects, update the `vercel.json` destination to match `VITE_FIREBASE_PROJECT_ID`** before deployment. Keep the app's own domain in the Firebase Authorized domains list and its exact `/__/auth/handler` URL in the Google OAuth client's Authorized redirect URIs. Preview deployments with changing domains need their own authorization; use a stable preview domain if you want to test Google sign-in there.

Keep Google sign-in, the Firestore database, and the published security rules in the Firebase project. Do not put a Firebase service-account key into this client-side app or any `VITE_` variable. The redirect fallback handles popups blocked by the browser, but a blocker that prevents requests to Google or Firebase entirely can still prevent sign-in.

The app stores each character at `users/{uid}/characters/{characterId}` using a generated ID. Each document contains `schemaVersion`, `build`, `tracker`, and `updatedAt`. Existing `main` documents appear in the roster automatically; previous single-character browser saves migrate to a roster with the same `main` ID. No manual data migration is needed, and the existing owner-only Firestore rules already cover the collection.

On first sign-in to an empty account, all existing guest characters are copied to that account. The guest roster remains as a local backup, separate from subsequent account edits. Existing accounts are never overwritten by guest data. Each account has a separate browser roster with pending changes tracked per character. If Firestore cannot be reached, changes remain in that browser and can be retried from the front page, Settings, or when the connection returns. If the same character is edited on two devices while one is offline, the later upload wins. Different characters sync independently. Cloud data is refreshed on sign-in, reload, and retry; there is no live cross-device subscription.

Deleting a character clears its build and tracker and keeps an empty document as a deletion marker, so a clean cached copy on another device does not bring it back. Offline edits to that same character still follow the later-upload-wins policy. Creating or canceling a new character never replaces the selected character.

Without Firebase values, the app still works as a local-only tracker.

## Checks

```sh
npm run test:run
npm run lint
npm run build
```
