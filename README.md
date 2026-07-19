# Online Data Sub

Mobile-first Next.js app for **data, airtime, bills**, wallet funding, and gold/stocks watch.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind  
- **Prisma** + PostgreSQL  
- **ASBDATA** — data, airtime, bills  
- **PalmPay** — permanent virtual account funding + webhook  
- **Termii** — OTP SMS  
- **GoldAPI** — gold price (optional)  
- JWT session cookie, PIN hashed with bcrypt  

Provider clients are ported from the `onlinedatasub` monorepo patterns.

## Features

- Signup → OTP verify → login (unverified users cannot stay logged in)  
- Forgot PIN (OTP → reset token → new PIN)  
- Wallet balance; fund via PalmPay bank transfer (BVN/NIN KYC)  
- Data + airtime (ASBDATA), bills (electricity / cable)  
- Referrals: code on profile; bonus on verified referred signup  
- Watch: gold + mock NGX  

## Local setup

```bash
npm install
cp .env.example .env   # fill DATABASE_URL, JWT_SECRET, provider keys
npx prisma generate
npx prisma db push
npm run dev
```

App: http://localhost:3000  

Without ASBDATA/PalmPay keys: purchases simulate; funding needs keys (or use **Wallet → Dev simulate credit** in development).

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
