# Google Play Store submission — Online Data Sub

Android package: **`app.onlinedatasub.mobile`**  
App name: **Online Data Sub**  
Production web: **https://online-data-sub-production.up.railway.app**  
Privacy policy (required): **https://online-data-sub-production.up.railway.app/privacy**  
Terms: **https://online-data-sub-production.up.railway.app/terms**

This guide walks from a signed **AAB** to a Play Console listing.

---

## 1. Prerequisites

| Item | Status / notes |
|------|----------------|
| Google Play Developer account ($25 one-time) | Required |
| Production app live on Railway | Health: `/api/health` |
| `NEXT_PUBLIC_APP_URL` on Railway | Must be the production HTTPS origin |
| `GOOGLE_CLIENT_ID` + secret on Railway | Web OAuth client |
| Android OAuth client | Package `app.onlinedatasub.mobile` + **release** SHA-1 |
| Privacy policy URL public | `/privacy` (no login) |
| Upload keystore | Create once; back up offline |

---

## 2. Create the upload keystore (once)

On your PC (never commit these files):

```bash
cd android
keytool -genkey -v \
  -keystore online-data-sub-upload.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

```bash
cp keystore.properties.example keystore.properties
# Edit keystore.properties with real passwords and path
```

Example `keystore.properties`:

```properties
storeFile=../online-data-sub-upload.jks
storePassword=********
keyAlias=upload
keyPassword=********
```

**Backup** the `.jks` + passwords in a password manager / offline drive. Losing them blocks updates (unless you use Play App Signing recovery).

Get **release SHA-1** for Google Sign-In:

```bash
keytool -list -v -keystore online-data-sub-upload.jks -alias upload
```

Add that SHA-1 to Google Cloud → Android OAuth client for `app.onlinedatasub.mobile`.

---

## 3. Sync Capacitor for production

```bash
# From repo root — Node 22+
export CAPACITOR_SERVER_URL="https://online-data-sub-production.up.railway.app"
export GOOGLE_CLIENT_ID="YOUR-WEB-CLIENT-ID.apps.googleusercontent.com"
npm run cap:sync:prod
```

Confirm `android/app/src/main/assets/capacitor.config.json` has:

- `server.url` → Railway HTTPS
- `plugins.GoogleNativeAuth.serverClientId` → Web client ID

---

## 4. Build the Play upload (AAB)

Play requires an **Android App Bundle** (`.aab`), not a raw APK.

```bash
cd android
./gradlew clean bundleRelease
```

Windows:

```bat
cd android
gradlew.bat clean bundleRelease
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

If `keystore.properties` is missing, the AAB may be **unsigned** — Android Studio can sign it, or create `keystore.properties` first.

### Android Studio alternative

1. `npm run cap:android`
2. **Build → Generate Signed App Bundle / APK**
3. Choose **Android App Bundle**
4. Select your upload keystore
5. Build type **release**

---

## 5. Versioning

In `android/app/build.gradle`:

| Field | First release | Every update |
|-------|---------------|--------------|
| `versionCode` | `1` | Increment (2, 3, …) — **must always increase** |
| `versionName` | `1.0.0` | User-facing, e.g. `1.0.1` |

---

## 6. Play Console listing (copy pack)

### Short description (≤ 80 chars)

```text
Buy data & airtime, pay bills, fund your wallet — fast and secure.
```

### Full description (draft)

```text
Online Data Sub makes everyday mobile top-ups simple.

• Buy data plans for MTN, Airtel, Glo, and 9mobile
• Buy airtime instantly
• Pay electricity and cable bills
• Fund your wallet via bank transfer
• Track transactions and notifications
• Optional fingerprint / face unlock for app access and payments

Sign in with email or Google. Your money and PIN stay protected with secure sessions and device biometrics where available.

Support: support@onlinedatasub.app
```

### Category

**Finance** (or **Tools** if Finance is restricted in your account)

### Contact

- Email: `support@onlinedatasub.app`
- Privacy: `https://online-data-sub-production.up.railway.app/privacy`

### Graphics (you must produce)

| Asset | Spec |
|-------|------|
| App icon | 512×512 PNG (32-bit), no alpha if Play rejects |
| Feature graphic | 1024×500 PNG |
| Phone screenshots | ≥ 2, up to 8 (portrait recommended) |
| Optional tablet | 7" / 10" if you claim tablet support |

Capture screenshots from a release/debug build on a real device or emulator.

---

## 7. Data safety form (Play Console)

Declare roughly:

| Data type | Collected? | Shared? | Purpose |
|-----------|------------|---------|---------|
| Name | Yes | With payment partners as needed | Account |
| Email | Yes | Auth providers | Account |
| Phone | Yes | VTU / bill partners | Service delivery |
| Financial info (transactions) | Yes | Payment partners | Process payments |
| User IDs | Yes | No (internal) | Account |
| App activity / diagnostics | Limited logs | Infra hosts | Security / reliability |
| Biometrics | **No** (processed on device only) | No | — |

- Encryption in transit: **Yes** (HTTPS)
- Account deletion: document process (email support) or in-app later
- Children: **Not directed to children**

---

## 8. Content rating

Complete the IARC questionnaire in Play Console (finance / utility style answers). No gambling, no social dating, etc.

---

## 9. Countries & pricing

- Free app
- Distribute where you can legally offer airtime/data (typically Nigeria first)
- Ensure payment partners allow those regions

---

## 10. Pre-launch checklist

- [ ] Railway `/api/health` returns ok
- [ ] Google Sign-In works on a **release** build (release SHA-1 registered)
- [ ] Email/password login works
- [ ] Data / airtime purchase smoke test on staging or small amount
- [ ] Wallet funding path works
- [ ] Biometric unlock + transaction biometric (optional settings)
- [ ] Privacy + terms URLs open without login
- [ ] No cleartext / localhost baked into Capacitor config
- [ ] `versionCode` unique for this upload
- [ ] AAB signed with upload key
- [ ] Play App Signing enrolled (recommended — Google holds app signing key)

---

## 11. Upload & review

1. Play Console → **Create app** → Online Data Sub  
2. Complete **Dashboard** tasks (privacy, ads declaration: *No ads* unless you add ads)  
3. **Production** (or closed testing first — recommended) → **Create release**  
4. Upload `app-release.aab`  
5. Roll out to **closed testing** → internal testers → then production  

First review can take days. Respond quickly to policy emails.

---

## 12. Useful commands

```bash
# Production sync
CAPACITOR_SERVER_URL=https://online-data-sub-production.up.railway.app \
GOOGLE_CLIENT_ID=....apps.googleusercontent.com \
npm run cap:sync:prod

# Release bundle
cd android && ./gradlew bundleRelease

# Install release APK locally (optional, after assembleRelease)
./gradlew assembleRelease
# adb install -r app/build/outputs/apk/release/app-release.apk
```

---

## 13. What this repo already configured

| Item | Location |
|------|----------|
| `applicationId` | `android/app/build.gradle` |
| `versionCode` / `versionName` | same |
| Release signing via `keystore.properties` | same |
| HTTPS-only network security | `res/xml/network_security_config.xml` |
| No auto-backup of app data | Manifest + `data_extraction_rules.xml` |
| Optional biometrics (not required hardware) | Manifest |
| Google package visibility queries | Manifest |
| Privacy + Terms pages | `/privacy`, `/terms` |
| Keystore gitignored | `.gitignore`, `android/.gitignore` |

---

## 14. After every store update

1. Bump `versionCode` (+1) and `versionName`  
2. `cap:sync:prod` if web URL / Google client changed  
3. `bundleRelease`  
4. Upload new AAB + release notes  
