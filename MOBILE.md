# Mobile app (Capacitor Android)

The Android app is a **native shell** that loads your production Next.js app (custom domain, backed by Railway) in a WebView. APIs, wallet, and webhooks stay on the server.

## Requirements

| Tool | Notes |
|------|--------|
| **Node.js ≥ 22** (24 recommended) | Capacitor CLI 8 requires Node 22+. This machine: `nvm use 24` |
| **Android Studio** | On your laptop/desktop (SDK + emulator or device) |
| **Production URL** | `https://onlinedatasub.com.ng` (custom domain) |

This Linux server **cannot** build APKs without Java/Android SDK. Scaffolding is done here; compile on a machine with Android Studio.

## Architecture

```
Android WebView  →  https://onlinedatasub.com.ng  →  Next.js + Prisma + webhooks (Railway)
```

Config: `capacitor.config.ts`  
- `webDir`: `native-www` (placeholder if offline)  
- `server.url`: production origin (defaults to **https://onlinedatasub.com.ng**)

## One-time setup (already done in repo)

- Capacitor packages + plugins  
- `android/` platform  
- Status bar / splash / back-button bootstrap (`CapacitorBootstrap`)

## Point the shell at production (custom domain)

```bash
# Use Node 24 for Cap CLI
nvm use 24

export CAPACITOR_SERVER_URL="https://onlinedatasub.com.ng"   # no trailing slash
npm run cap:sync
```

`capacitor.config.ts` already defaults to `https://onlinedatasub.com.ng` (and ignores localhost).  
On Railway (or your host), set **`NEXT_PUBLIC_APP_URL=https://onlinedatasub.com.ng`** so OAuth/callbacks match the custom domain—not the `*.up.railway.app` hostname.

## Open in Android Studio (on your PC)

```bash
git pull
nvm use 24
export CAPACITOR_SERVER_URL="https://onlinedatasub.com.ng"
npm ci
npm run cap:sync
npm run cap:android    # opens Android Studio
```

Then: **Run** on emulator or USB device.

### Google Sign-In in the app

The Android app uses native Google Sign-In first. Tapping Google opens the device Google account picker, then the app sends the returned ID token to `/api/auth/google/native` to create the normal app session.

Google Cloud setup:

- Web OAuth client: set `GOOGLE_CLIENT_ID` on the server and when running `npm run cap:sync:prod`.
- Web OAuth redirect for browser fallback: `https://onlinedatasub.com.ng/api/auth/google/callback`.
- Authorized JavaScript origins should include `https://onlinedatasub.com.ng`.
- Android OAuth client: add package name `app.onlinedatasub.mobile` and the SHA-1/SHA-256 fingerprints for your debug and release signing keys.

After changing any Google client ID or production URL, sync before building:

```bash
export CAPACITOR_SERVER_URL="https://onlinedatasub.com.ng"
export GOOGLE_CLIENT_ID="YOUR-WEB-OAUTH-CLIENT-ID.apps.googleusercontent.com"
npm run cap:sync:prod
```

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run cap:sync` | Copy config + update Android project |
| `npm run cap:sync:prod` | Sync but fail if no server URL is set |
| `npm run cap:android` | Open Android Studio |
| `npm run cap:copy` | Copy web assets only |

## Build a release APK / AAB (Play Store)

Full checklist: **[PLAY_STORE.md](./PLAY_STORE.md)**.

```bash
# 1) Bake production server + Google client into the shell
export CAPACITOR_SERVER_URL="https://onlinedatasub.com.ng"
export GOOGLE_CLIENT_ID="YOUR-WEB-CLIENT-ID.apps.googleusercontent.com"
npm run cap:sync:prod

# 2) Create keystore once → android/keystore.properties (see keystore.properties.example)

# 3) Play Store upload (AAB)
npm run android:bundle
# → android/app/build/outputs/bundle/release/app-release.aab
```

Or Android Studio: **Build → Generate Signed App Bundle**.  
Never commit `*.jks` / `keystore.properties`.

## iOS

Not scaffolded yet (needs macOS + Xcode). Later:

```bash
npm i -D @capacitor/ios
npx cap add ios
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Blank WebView | `CAPACITOR_SERVER_URL` wrong or domain/Railway down; check `https://onlinedatasub.com.ng/api/health` |
| CLI: Node ≥ 22 required | `nvm use 24` |
| Stale plugins | `npm run cap:sync` after package changes |
| Google login fails in app | OAuth redirect/origin must match Railway URL |
| Funding works on web not “in app” | Same backend — check webhooks + same account |
