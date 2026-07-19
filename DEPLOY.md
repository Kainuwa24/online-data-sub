# Deploy Online Data Sub on Render

Single **Next.js** web service + **PostgreSQL**. Providers: **ASBDATA** (data/airtime/bills), **PalmPay** (wallet funding), **Termii** (OTP).

## 1. Push to GitHub

```bash
git init
git add .
git commit -m "Online Data Sub MVP"
# create a GitHub repo, then:
git remote add origin https://github.com/YOU/online-data-sub.git
git push -u origin main
```

## 2. Blueprint deploy

1. Render → **New +** → **Blueprint**
2. Connect the repo; Render detects `render.yaml`
3. Fill `sync: false` secrets when prompted

### Required secrets

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_APP_URL` | e.g. `https://online-data-sub.onrender.com` |
| `ASBDATA_TOKEN` | From ASBDATA dashboard |
| `TERMII_API_KEY` | OTP SMS |
| `PALMPAY_APP_ID` | PalmPay merchant |
| `PALMPAY_MERCHANT_PRIVATE_KEY` | RSA private key (PEM or base64) |
| `PALMPAY_PUBLIC_KEY` | For webhook signature verify |
| `PALMPAY_MERCHANT_PUBLIC_KEY` | If issued by PalmPay |
| `GOLDAPI_KEY` | Optional for live gold |

`JWT_SECRET` and `DATABASE_URL` are set by the Blueprint.

## 3. After first deploy

1. Open `https://<service>.onrender.com/api/health` — should return `"ok": true`
2. Set PalmPay webhook to:

```text
POST https://<service>.onrender.com/api/webhooks/palmpay
```

3. Whitelist the Render **outbound/static IP** in PalmPay merchant console (VA create fails with “ip not in white list” otherwise)
4. Switch `PALMPAY_ENV=live` only after sandbox works
5. Confirm ASBDATA IP whitelist if required by their support

## 4. Smoke test

1. Sign up → OTP (Termii or console log if key missing) → login  
2. Profile → add BVN or NIN  
3. Wallet → create funding account → transfer (or use simulate only on local)  
4. Buy data / airtime / pay a bill  

## 5. Local development

```bash
cp .env.example .env
# fill DATABASE_URL (local Postgres or Neon), JWT_SECRET, keys
npm install
npx prisma db push
npm run dev
```

Without provider keys the app simulates ASBDATA purchases and PalmPay remains disabled until keys are set. Dev wallet simulate: Wallet page → Credit (only when `NODE_ENV=development`).

## Cost note

Blueprint uses starter web + basic-256mb Postgres. Upgrade database before production money volume.
