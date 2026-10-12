# D&D Combat Tracker

A React and TypeScript character and combat tracker. Character data stays in the browser for guest play. Google sign-in can also save one character per account in Cloud Firestore.

## Run locally

Use Node.js 20.19+ or 22.12+ and run:

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. On Windows PowerShell, use `npm.cmd` in place of `npm` if script execution is disabled.

## Connect Firebase

1. Create a Firebase project and register a **Web app** in the [Firebase console](https://console.firebase.google.com/). Copy its web configuration values.
2. In **Authentication → Sign-in method**, enable **Google**. In **Authentication → Settings → Authorized domains**, add `localhost` for local development if it is absent. Add your deployed site domain before publishing.
3. Create a **Cloud Firestore** database. In **Firestore → Rules**, paste the contents of [`firestore.rules`](firestore.rules) and publish them. These rules allow a signed-in player to access only their own character path.
4. Copy `.env.example` to `.env.local` and fill in the four values from the Firebase web app configuration. Restart Vite after changing the file.
5. Start the app, choose **Log in with Google** from the account menu, and check **Settings → Account and cloud save** for the save status.

Only the person running or deploying the build needs `.env.local`. Vite includes the Firebase web app configuration in the built JavaScript, so players only visit the site and sign in. This configuration identifies the Firebase project; the Firestore rules above protect each player's data.

### Deploying on Vercel

In the Vercel project, open **Settings → Environment Variables** and add the four `VITE_FIREBASE_*` values from `.env.example` for **Production** (and Preview if you use preview deployments). Redeploy after adding or changing them. Players do not need these variables or an `.env` file.

Keep Google sign-in, the Firestore database, and the published security rules in the Firebase project. Add your Vercel site's domain to **Firebase Authentication → Settings → Authorized domains**. Do not put a Firebase service-account key into this client-side app or any `VITE_` variable.

The app stores account data at `users/{uid}/characters/main`. On a player's first sign-in, if that account has no cloud character, an existing guest character is saved to it; the guest copy is removed after the cloud save succeeds. Each account also has a separate browser save. If Firestore cannot be reached, account changes remain in that browser and can be retried in Settings or when the connection returns. If the same account is edited on two devices while one is offline, the later upload wins.

Without Firebase values, the app still works as a local-only tracker.

## Checks

```sh
npm run test:run
npm run lint
npm run build
```
