# Deploy Online Data Sub (Render) — for PalmPay webhooks

PalmPay **cannot** call `localhost`. You need a public HTTPS URL.

## Why Render

- Public URL: `https://online-data-sub.onrender.com` (or similar)
- Postgres included via Blueprint
- Webhook: `https://<your-service>.onrender.com/api/webhooks/palmpay`

## 1. Commit & push to GitHub

```bash
cd ~/online-data-sub
git add -A
git status   # confirm .env is NOT listed
git commit -m "Ready for Render deploy (PalmPay webhooks)"
```

Create a repo on GitHub (empty), then:

```bash
git remote add origin https://github.com/YOUR_USER/online-data-sub.git
git branch -M main
git push -u origin main
```

## 2. Deploy with Blueprint

1. Open [https://dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Blueprint**
3. Connect the GitHub repo
4. Render reads `render.yaml` (web + Postgres)

### Env values Render will ask for (`sync: false`)

Fill these in the Blueprint form / Environment tab:

| Variable | Example / notes |
|----------|------------------|
| `NEXT_PUBLIC_APP_URL` | `https://online-data-sub.onrender.com` (use the real URL after first deploy if name differs) |
| `ASBDATA_TOKEN` | Your ASBDATA token |
| `PALMPAY_ENV` | `live` or `sandbox` |
| `PALMPAY_APP_ID` | Merchant app id |
| `PALMPAY_MERCHANT_PRIVATE_KEY` | Full private key (paste as one line or with `\n`) |
| `PALMPAY_PUBLIC_KEY` | PalmPay public key for webhook verify |
| `PALMPAY_MERCHANT_PUBLIC_KEY` | If PalmPay issued one |
| `FLUTTERWAVE_SECRET_KEY` | Optional secondary funding provider |
| `FLUTTERWAVE_SECRET_HASH` | Webhook secret hash from Flutterwave dashboard |
| `GOOGLE_CLIENT_ID` | Optional for Google login |
| `GOOGLE_CLIENT_SECRET` | Optional |
| `TERMII_API_KEY` | Optional until SMS works |
| `RESEND_API_KEY` | Optional for magic link email |
| `GOLDAPI_KEY` | Optional |

Auto-set by Blueprint: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV`.

## 3. After deploy succeeds

### 3.1 Health check

```text
https://YOUR-SERVICE.onrender.com/api/health
```

Should return `"ok": true`.

### 3.2 Fix public URL + Google OAuth

1. In Render → Environment, set:

```text
NEXT_PUBLIC_APP_URL=https://YOUR-SERVICE.onrender.com
```

2. Redeploy (or “Manual Deploy”).

3. Google Cloud Console → OAuth client → add:

```text
Authorized JavaScript origins:
  https://YOUR-SERVICE.onrender.com

Authorized redirect URIs:
  https://YOUR-SERVICE.onrender.com/api/auth/google/callback
```

### 3.3 PalmPay webhook (required for PalmPay funding)

In PalmPay merchant dashboard, register:

```text
POST https://YOUR-SERVICE.onrender.com/api/webhooks/palmpay
```

Response body must be plain text `success` (already implemented).

### 3.4 Flutterwave webhook (optional secondary funding)

In Flutterwave dashboard → Settings → Webhooks:

```text
POST https://YOUR-SERVICE.onrender.com/api/webhooks/flutterwave
```

Use the same secret hash as `FLUTTERWAVE_SECRET_HASH`. Subscribe to charge/virtual-account events.

### 3.5 PalmPay IP whitelist (required for VA create)

VA create failed locally with `request ip not in ip white list`.  
On Render, whitelist **Render outbound IPs** for your service/region in the PalmPay console.

- Render docs: [Static outbound IP addresses](https://render.com/docs/static-outbound-ip-addresses)  
- Starter plans may need the static IP add-on; free/shared IPs can change.

Without whitelist, `/api/wallet/funding/account` keeps failing even with a public URL.

## 4. Smoke test on production

1. Open the site → sign up (Google/magic link/phone)  
2. Complete profile (phone, BVN/NIN, PIN)  
3. Wallet → pick **PalmPay** or **Flutterwave** → **Create funding account**  
4. Transfer small amount from your bank  
5. Confirm wallet balance increases via webhook  
6. Buy data with PIN confirm  

## 5. Cost note

Blueprint: web **starter** + Postgres **basic-256mb**.  
Fine for testing webhooks; upgrade DB before real volume.

## Local still useful

Local `npm run dev` + **simulate funding** for UI/flows.  
Real PalmPay credits only after deploy + webhook + IP whitelist.
