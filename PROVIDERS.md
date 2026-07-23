# Provider setup notes

## 1. ASBDATA (data / airtime / bills) — https://asbdata.com

- Auth: `Authorization: Token <ASBDATA_TOKEN>`
- Base URL: `https://asbdata.com`
- Endpoints used:
  - `GET /api/network/` — data plan catalog
  - `POST /api/data/` — buy data
  - `POST /api/topup/` — buy airtime (`airtime_type`: VTU / awuf4U / Share and Sell)
  - `POST /api/billpayment/` — electricity
  - `POST /api/cablesub/` — cable TV
- Docs: https://documenter.getpostman.com/view/12429346/UVe9QUS8
- Env: `ASBDATA_TOKEN`, optional `ASBDATA_PLATFORM_MARKUP_NGN`, `ASBDATA_AIRTIME_TYPE`

Without a token the app uses **simulated** purchases and a small fallback plan list.

## 2. PalmPay (wallet funding) — https://docs.palmpay.com/

Permanent **virtual account** flow (same pattern as MafitaPay / onlinedatasub monorepo):

1. User adds **BVN or NIN** on Profile  
2. `POST /api/wallet/funding/account` creates a permanent VA  
3. User transfers from any bank app  
4. PalmPay webhook `POST /api/webhooks/palmpay` credits wallet (idempotent)  
5. Response body must be plain text **`success`**

Env:

```env
PALMPAY_ENV=sandbox|live
PALMPAY_APP_ID=
PALMPAY_MERCHANT_PRIVATE_KEY=
PALMPAY_PUBLIC_KEY=
PALMPAY_MERCHANT_PUBLIC_KEY=
PALMPAY_COUNTRY_CODE=NG
```

**Production checklist**

1. Whitelist server public IP in PalmPay console  
2. Register HTTPS webhook URL  
3. `orderAmount` is **kobo** — do not divide twice  
4. KYC required or banks show “recipient KYC incomplete”

## 3. Flutterwave (secondary wallet funding) — https://developer.flutterwave.com/

Permanent **static virtual account** (cloned from MafitaPay):

1. User adds **BVN or NIN** on Profile  
2. Wallet → select **Flutterwave** → create funding account  
3. `POST /api/wallet/funding/account` with `{ "provider": "flutterwave" }`  
   creates a permanent VA (`is_permanent: true` + bvn/nin)  
4. User transfers from any bank app  
5. Flutterwave webhook `POST /api/webhooks/flutterwave` credits wallet (idempotent)  
6. Matches deposits by `tx_ref` starting with `static_va_` or VA account number  

Env:

```env
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-...
FLUTTERWAVE_SECRET_HASH=your-dashboard-secret-hash
# optional
FLUTTERWAVE_BASE_URL=https://api.flutterwave.com/v3
```

**Production checklist**

1. Register HTTPS webhook URL in Flutterwave dashboard → Settings → Webhooks  
   `https://YOUR-HOST/api/webhooks/flutterwave`  
2. Set the same **Secret hash** as `FLUTTERWAVE_SECRET_HASH`  
3. Subscribe to `charge.completed` (bank transfer / virtual account)  
4. Amounts from Flutterwave are **NGN** (major units) — converted to kobo on credit  
5. Prefer `amount_settled` when verifying the transaction  

Users can hold **both** PalmPay and Flutterwave permanent accounts; Wallet page has a provider toggle.

## 4. Termii (OTP/SMS) — https://termii.com

- Register sender ID; request **DND/transactional** route so MTN delivers overnight  
- Env: `TERMII_API_KEY`, `TERMII_SENDER_ID`  
- Without a key, OTPs are logged to the server console (dev only)

## 5. GoldAPI — https://www.goldapi.io

Optional. Without a key the Watch page shows a mock gold price. `USD_NGN_FALLBACK_RATE` converts USD→NGN until a live FX source is added.

## 6. NGX stocks

Still mock on the Watch page. Official NGX data is expensive at MVP stage.

## Regulatory note

Holding customer wallet balances in Nigeria is regulated. Partner with a licensed entity (MFB/PSB) or obtain the right license before treating balances as real production e-money.
