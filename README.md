# Online Data Sub

Mobile-first Next.js app for **data, airtime, bills**, wallet funding, and gold/stocks watch.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind  
- **Prisma** + PostgreSQL  
- **ASBDATA** — data, airtime, bills  
- **PalmPay** — permanent virtual account funding + webhook  
- **Flutterwave** — secondary permanent VA funding + webhook (MafitaPay pattern)  
- **Termii** — OTP SMS  
- **GoldAPI** — gold price (optional)  
- JWT session cookie, PIN hashed with bcrypt  
- **Capacitor 8** — Android shell (loads production web app); see [MOBILE.md](./MOBILE.md)  

Provider clients are ported from the `onlinedatasub` monorepo patterns.

## Features

- Sign in with Google or email + password  
- Complete profile (phone, BVN/NIN, transaction PIN) after first signup  
- Forgot PIN for purchase PIN (OTP → reset)  
- Wallet balance; fund via PalmPay or Flutterwave bank transfer (BVN/NIN KYC)  
- Data + airtime (ASBDATA), bills (electricity / cable)  
- Referrals: code on profile; bonus on verified referred signup  
- Watch: gold + mock NGX  

## Local setup

Local DB uses **SQLite** (no Postgres install). Production/Render uses Postgres via `schema.postgres.prisma`.

```bash
npm install
cp .env.example .env   # already fine for local: DATABASE_URL="file:./dev.db"
npm run db:setup       # prisma db push + generate
npm run dev
```

App: http://localhost:3000  

If you see `Environment variable not found: DATABASE_URL`, create `.env` from `.env.example` and restart `npm run dev`.

Without ASBDATA/PalmPay keys: purchases **simulate**; use **Wallet → Dev simulate credit** in development to add balance.

## Deploy

See **[DEPLOY.md](DEPLOY.md)** for Render Blueprint (`render.yaml`).

## Folder map

```
src/
  lib/
    prisma.ts, auth.ts, session.ts, wallet.ts, phone.ts, money.ts, funding.ts
    services/   asbdata, palmpay, termii, goldapi
  app/
    (auth)/     login, signup, otp, forgot-pin
    (app)/      home, data, bills, watch, wallet, profile
    api/        route handlers + webhooks/palmpay
prisma/schema.prisma
render.yaml
```

See **PROVIDERS.md** for API keys and production gotchas (PalmPay IP whitelist, Termii DND).
