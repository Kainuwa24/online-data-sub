/**
 * Renders code-accurate phone UI screenshots for Play Store.
 * Uses Microsoft Edge headless (Chromium).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = __dirname;
const htmlDir = path.join(outDir, "html");
const W = 1080;
const H = 1920;

const edge =
  process.env.EDGE_PATH ||
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

const CSS = `
:root {
  --blue: #2C5AA0;
  --blue-dark: #1A3A6B;
  --blue-soft: #E8F0FA;
  --red: #A3342E;
  --ink: #0F172A;
  --muted: #64748B;
  --line: #E8ECF2;
  --gold: #8C6A22;
  --bg: #F7F8FA;
  --soft: 0 3px 16px -6px rgba(15, 23, 42, 0.16);
  --glow: 0 14px 32px -20px rgba(44, 90, 160, 0.55);
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  width: ${W}px; height: ${H}px; overflow: hidden;
  font-family: "Segoe UI", system-ui, sans-serif;
  color: var(--ink); background: var(--bg);
}
.phone {
  width: ${W}px; height: ${H}px; position: relative;
  background: linear-gradient(180deg, #f8fafc 0%, #eef3f8 52%, #f8fafc 100%);
  padding: 56px 40px 0;
}
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 28px; }
.sub { font-size: 22px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
.title { font-size: 48px; font-weight: 800; letter-spacing: -0.02em; margin-top: 6px; }
.header-actions { display: flex; gap: 14px; }
.icon-btn {
  width: 72px; height: 72px; border-radius: 18px; background: #fff;
  border: 1px solid var(--line); box-shadow: var(--soft);
  display: flex; align-items: center; justify-content: center; font-size: 28px; color: var(--muted);
}
.avatar {
  width: 72px; height: 72px; border-radius: 18px;
  background: linear-gradient(145deg, #3B6BB8, #1A3A6B);
  color: #fff; font-weight: 800; font-size: 28px;
  display: flex; align-items: center; justify-content: center;
  box-shadow: var(--glow);
}
.wallet {
  background: linear-gradient(145deg, #3B6BB8 0%, #2C5AA0 42%, #1A3A6B 100%);
  border-radius: 28px; padding: 36px 32px; color: #fff; box-shadow: var(--glow);
  position: relative; overflow: hidden;
}
.wallet-label { font-size: 20px; letter-spacing: 0.12em; text-transform: uppercase; opacity: 0.75; font-weight: 600; }
.wallet-amt { font-size: 64px; font-weight: 800; margin-top: 16px; letter-spacing: -0.03em; }
.wallet-actions { display: flex; gap: 14px; margin-top: 28px; }
.wallet-actions .btn {
  flex: 1; background: #fff; color: var(--blue); border-radius: 16px; padding: 22px;
  text-align: center; font-weight: 700; font-size: 22px;
}
.wallet-actions .btn-ghost {
  background: rgba(255,255,255,0.12); color: #fff; border: 1px solid rgba(255,255,255,0.25);
}
.section { margin-top: 40px; }
.section-label {
  font-size: 20px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 18px;
}
.actions { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
.action { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.action-icon {
  width: 88px; height: 88px; border-radius: 20px; display: flex; align-items: center; justify-content: center;
  font-size: 34px; border: 1px solid rgba(255,255,255,0.7); box-shadow: var(--soft);
}
.action span { font-size: 18px; color: var(--muted); font-weight: 600; text-align: center; }
.gold {
  margin-top: 32px; border-radius: 24px; padding: 28px 24px;
  background: linear-gradient(150deg, #F8F1DF 0%, #FFFFFF 55%, #F3ECDA 100%);
  border: 1px solid #EDE4D0; box-shadow: var(--soft);
  display: flex; align-items: center; justify-content: space-between;
}
.gold-left { display: flex; gap: 18px; align-items: center; }
.gold-icon {
  width: 72px; height: 72px; border-radius: 18px; background: #fff;
  display: flex; align-items: center; justify-content: center; font-size: 28px;
  box-shadow: var(--soft); color: var(--gold);
}
.gold-kicker { font-size: 18px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--gold); }
.gold-title { font-size: 28px; font-weight: 800; margin-top: 4px; }
.card {
  background: #fff; border-radius: 22px; border: 1px solid rgba(232,236,242,0.9);
  box-shadow: var(--soft); overflow: hidden;
}
.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 26px 24px; border-bottom: 1px solid rgba(232,236,242,0.7);
}
.row:last-child { border-bottom: 0; }
.row-left { display: flex; gap: 18px; align-items: center; }
.badge {
  width: 72px; height: 72px; border-radius: 16px; background: var(--blue-soft);
  display: flex; align-items: center; justify-content: center; color: var(--blue); font-size: 28px;
}
.row-title { font-size: 26px; font-weight: 700; }
.row-sub { font-size: 20px; color: var(--muted); margin-top: 4px; }
.amount { font-size: 26px; font-weight: 700; font-family: ui-monospace, Consolas, monospace; color: var(--blue); }
.nav {
  position: absolute; left: 28px; right: 28px; bottom: 36px;
  height: 110px; border-radius: 28px; background: rgba(255,255,255,0.94);
  border: 1px solid rgba(232,236,242,0.8); box-shadow: 0 -8px 24px -18px rgba(15,23,42,0.24);
  display: flex; align-items: center; justify-content: space-around; padding: 0 8px;
}
.nav-item { display: flex; flex-direction: column; align-items: center; gap: 6px; color: #94a3b8; font-size: 18px; font-weight: 600; width: 100px; }
.nav-item.active { color: var(--blue); }
.nav-item .ico { font-size: 30px; }
.nav-item.active .bar { width: 36px; height: 4px; background: var(--blue); border-radius: 4px; margin-bottom: 2px; }
.tabs { display: flex; gap: 8px; background: #fff; border-radius: 24px; padding: 10px; border: 1px solid var(--line); box-shadow: var(--soft); margin-bottom: 28px; }
.tab { flex: 1; text-align: center; padding: 20px; border-radius: 18px; font-size: 24px; font-weight: 600; color: var(--muted); }
.tab.on { background: var(--blue); color: #fff; font-weight: 800; }
.field-label { font-size: 20px; font-weight: 700; color: var(--muted); margin-bottom: 10px; }
.field {
  background: #fff; border: 1px solid var(--line); border-radius: 18px; padding: 24px 22px;
  font-size: 28px; color: var(--ink); margin-bottom: 28px; box-shadow: var(--soft);
}
.networks { display: flex; gap: 12px; margin-bottom: 28px; }
.net {
  flex: 1; text-align: center; padding: 20px 8px; border-radius: 16px; font-size: 20px; font-weight: 600;
  background: #fff; border: 1px solid var(--line); color: var(--muted);
}
.net.on { background: var(--blue); color: #fff; font-weight: 800; border-color: var(--blue); }
.plans { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 16px; }
.plan {
  background: #fff; border: 1px solid var(--line); border-radius: 20px; padding: 28px 22px 24px;
  box-shadow: var(--soft); position: relative;
}
.plan-size { font-size: 34px; font-weight: 800; }
.plan-val { font-size: 20px; color: var(--muted); margin-top: 4px; }
.plan-price { font-size: 26px; font-weight: 800; color: var(--blue); margin-top: 14px; font-family: ui-monospace, Consolas, monospace; }
.pill {
  position: absolute; left: 50%; top: 0; transform: translate(-50%, -50%);
  background: var(--blue-soft); color: var(--blue); font-size: 16px; font-weight: 700;
  padding: 6px 14px; border-radius: 999px; border: 1px solid rgba(44,90,160,0.15); white-space: nowrap;
}
.auth {
  padding: 48px 40px 40px; height: 100%; display: flex; flex-direction: column;
}
.auth-head { display: flex; gap: 16px; align-items: center; margin-bottom: 48px; }
.auth-logo {
  width: 72px; height: 72px; border-radius: 18px; background: #fff; border: 1px solid var(--line);
  box-shadow: var(--soft); display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.auth-logo img { width: 100%; height: 100%; object-fit: cover; }
.auth-name { font-size: 28px; font-weight: 800; }
.auth-tag { font-size: 20px; color: var(--muted); margin-top: 4px; }
.eyebrow { font-size: 20px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--blue); margin-bottom: 12px; }
.auth-title { font-size: 58px; font-weight: 800; letter-spacing: -0.02em; line-height: 1.15; }
.auth-sub { font-size: 26px; color: var(--muted); margin-top: 12px; line-height: 1.45; }
.gbtn {
  margin-top: 40px; width: 100%; padding: 26px; border-radius: 18px; border: 1px solid var(--line);
  background: #fff; font-size: 28px; font-weight: 700; display: flex; align-items: center; justify-content: center; gap: 14px;
  box-shadow: var(--soft);
}
.or {
  display: flex; align-items: center; gap: 16px; margin: 32px 0; color: var(--muted); font-size: 20px;
}
.or::before, .or::after { content: ""; flex: 1; height: 1px; background: var(--line); }
.input {
  width: 100%; border: 1px solid var(--line); border-radius: 18px; padding: 24px 22px;
  font-size: 28px; margin-bottom: 20px; background: #fff;
}
.primary {
  width: 100%; margin-top: 16px; padding: 28px; border-radius: 18px; border: 0;
  background: linear-gradient(180deg, var(--blue), var(--blue-dark)); color: #fff;
  font-size: 28px; font-weight: 800; box-shadow: var(--glow);
}
.footer { margin-top: auto; text-align: center; font-size: 24px; color: var(--muted); padding-bottom: 24px; }
.footer b { color: var(--blue); }
.provider {
  display: inline-flex; border-radius: 999px; border: 1px solid var(--line); padding: 4px; background: rgba(255,255,255,0.7); margin-bottom: 20px;
}
.provider span {
  padding: 14px 28px; border-radius: 999px; font-size: 22px; font-weight: 700; color: #475569;
}
.provider span.on { background: var(--ink); color: #fff; }
.acct {
  background: #fff; border-radius: 22px; border: 1px solid var(--line); padding: 32px 28px; box-shadow: var(--soft);
}
.acct-bank { font-size: 22px; color: var(--muted); }
.acct-num { font-size: 48px; font-weight: 800; letter-spacing: 0.08em; margin-top: 12px; font-family: ui-monospace, Consolas, monospace; }
.acct-name { font-size: 26px; font-weight: 700; margin-top: 16px; }
.menu .row { padding: 30px 24px; }
.menu .ico { width: 28px; color: var(--muted); font-size: 28px; }
.chev { color: #cbd5e1; font-size: 28px; }
`;

function shell(active, body, opts = {}) {
  const nav = [
    ["home", "⌂", "Home"],
    ["data", "≋", "Data"],
    ["bills", "▤", "Bills"],
    ["watch", "↗", "Watch"],
    ["history", "◷", "History"],
  ]
    .map(
      ([id, ico, label]) => `
      <div class="nav-item ${active === id ? "active" : ""}">
        ${active === id ? '<div class="bar"></div>' : ""}
        <div class="ico">${ico}</div>
        <div>${label}</div>
      </div>`,
    )
    .join("");

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${CSS}</style></head>
  <body><div class="phone" style="${opts.noPad ? "padding:0" : ""}">
  ${body}
  ${opts.hideNav ? "" : `<nav class="nav">${nav}</nav>`}
  </div></body></html>`;
}

const screens = {
  "01-login": shell(
    null,
    `
    <div class="auth">
      <div class="auth-head">
        <div class="auth-logo"><div style="width:100%;height:100%;background:linear-gradient(145deg,#3B6BB8,#1A3A6B);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:28px">OD</div></div>
        <div>
          <div class="auth-name">Online Data Sub</div>
          <div class="auth-tag">Data / Airtime / Bills</div>
        </div>
      </div>
      <div class="eyebrow">Welcome back</div>
      <div class="auth-title">Sign in</div>
      <div class="auth-sub">Google or email — same account on web and in the app.</div>
      <button class="gbtn"><span style="width:28px;height:28px;border-radius:50%;background:conic-gradient(#ea4335,#fbbc05,#34a853,#4285f4);display:inline-block"></span> Continue with Google</button>
      <div class="or">or email</div>
      <div class="field-label">Email</div>
      <div class="input">you@example.com</div>
      <div class="field-label">Password</div>
      <div class="input">••••••••</div>
      <button class="primary">Sign in</button>
      <div class="footer">New here? <b>Create an account</b></div>
    </div>
  `,
    { hideNav: true, noPad: true },
  ),

  "02-home": shell(
    "home",
    `
    <div class="header">
      <div>
        <div class="sub">Good afternoon</div>
        <div class="title">Shehu</div>
      </div>
      <div class="header-actions">
        <div class="icon-btn">🔔</div>
        <div class="avatar">S</div>
      </div>
    </div>
    <div class="wallet">
      <div class="wallet-label">✦ Wallet balance</div>
      <div class="wallet-amt">₦12,450.00</div>
      <div class="wallet-actions">
        <div class="btn">+ Fund wallet</div>
        <div class="btn btn-ghost">◷ History</div>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Quick actions</div>
      <div class="actions">
        <div class="action"><div class="action-icon" style="background:#E8F0FA;color:#2C5AA0">📱</div><span>Buy data</span></div>
        <div class="action"><div class="action-icon" style="background:#FFFBEB;color:#B45309">⚡</div><span>Airtime</span></div>
        <div class="action"><div class="action-icon" style="background:#ECFDF5;color:#047857">🧾</div><span>Electricity</span></div>
        <div class="action"><div class="action-icon" style="background:#F5F3FF;color:#6D28D9">📺</div><span>Cable TV</span></div>
      </div>
    </div>
    <div class="gold">
      <div class="gold-left">
        <div class="gold-icon">↗</div>
        <div>
          <div class="gold-kicker">Watch · preview</div>
          <div class="gold-title">Gold & markets — watch only</div>
        </div>
      </div>
      <div style="font-size:32px;color:var(--gold)">›</div>
    </div>
    <div class="section">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <div class="section-label" style="margin:0">Recent activity</div>
        <div style="font-size:20px;font-weight:700;color:var(--blue)">See all</div>
      </div>
      <div class="card">
        <div class="row">
          <div class="row-left"><div class="badge">↓</div><div><div class="row-title">Wallet funding</div><div class="row-sub">Today, 2:14 PM</div></div></div>
          <div class="amount">+₦5,000.00</div>
        </div>
        <div class="row">
          <div class="row-left"><div class="badge" style="background:#FCECEA;color:var(--red)">↑</div><div><div class="row-title">MTN 2GB · 30 days</div><div class="row-sub">Yesterday, 6:02 PM</div></div></div>
          <div class="amount" style="color:var(--red)">−₦1,200.00</div>
        </div>
        <div class="row">
          <div class="row-left"><div class="badge" style="background:#FCECEA;color:var(--red)">↑</div><div><div class="row-title">Airtime ₦500</div><div class="row-sub">Mon, 11:20 AM</div></div></div>
          <div class="amount" style="color:var(--red)">−₦500.00</div>
        </div>
      </div>
    </div>
  `,
  ),

  "03-data": shell(
    "data",
    `
    <div class="header">
      <div>
        <div class="sub">Buy</div>
        <div class="title">Data & Airtime</div>
      </div>
      <div class="header-actions">
        <div class="icon-btn">🔔</div>
        <div class="avatar">D</div>
      </div>
    </div>
    <div class="tabs">
      <div class="tab on">data</div>
      <div class="tab">airtime</div>
    </div>
    <div class="field-label">Recipient phone number</div>
    <div class="field">0803 000 0000</div>
    <div class="section-label">Network</div>
    <div class="networks">
      <div class="net on">MTN</div>
      <div class="net">Airtel</div>
      <div class="net">Glo</div>
      <div class="net">9mobile</div>
    </div>
    <div class="section-label">Choose a plan</div>
    <div class="plans">
      <div class="plan"><div class="plan-size">500MB</div><div class="plan-val">7 days</div><div class="plan-price">₦350</div></div>
      <div class="plan"><span class="pill">SME</span><div class="plan-size">1GB</div><div class="plan-val">30 days</div><div class="plan-price">₦500</div></div>
      <div class="plan"><div class="plan-size">2GB</div><div class="plan-val">30 days</div><div class="plan-price">₦1,200</div></div>
      <div class="plan"><div class="plan-size">5GB</div><div class="plan-val">30 days</div><div class="plan-price">₦2,500</div></div>
      <div class="plan"><div class="plan-size">10GB</div><div class="plan-val">30 days</div><div class="plan-price">₦4,500</div></div>
      <div class="plan"><span class="pill">GIFTING</span><div class="plan-size">15GB</div><div class="plan-val">30 days</div><div class="plan-price">₦6,000</div></div>
    </div>
  `,
  ),

  "04-wallet": shell(
    "home",
    `
    <div class="header">
      <div>
        <div class="sub">Manage</div>
        <div class="title">Wallet</div>
      </div>
      <div class="header-actions">
        <div class="icon-btn">🔔</div>
        <div class="avatar">W</div>
      </div>
    </div>
    <div class="wallet">
      <div class="wallet-label">Available balance</div>
      <div class="wallet-amt">₦12,450.00</div>
    </div>
    <div class="section">
      <div class="section-label">Fund via bank transfer</div>
      <div class="provider"><span class="on">Flutterwave</span><span>PalmPay</span></div>
      <div class="acct">
        <div class="acct-bank">🏛 Wema Bank · Flutterwave</div>
        <div class="acct-num">7829341056</div>
        <div style="font-size:20px;color:var(--muted);margin-top:18px">Account name</div>
        <div class="acct-name">Online Data Sub / Shehu Usman</div>
        <div style="font-size:20px;color:var(--muted);margin-top:20px;line-height:1.4">Transfer any amount from your bank app. Your wallet updates after Flutterwave confirms.</div>
      </div>
    </div>
    <div class="section">
      <div class="section-label">Recent</div>
      <div class="card">
        <div class="row">
          <div class="row-left"><div class="badge">↓</div><div><div class="row-title">Wallet funding</div><div class="row-sub">Today, 2:14 PM</div></div></div>
          <div class="amount">+₦5,000.00</div>
        </div>
        <div class="row">
          <div class="row-left"><div class="badge" style="background:#FCECEA;color:var(--red)">↑</div><div><div class="row-title">MTN 2GB</div><div class="row-sub">Yesterday</div></div></div>
          <div class="amount" style="color:var(--red)">−₦1,200.00</div>
        </div>
      </div>
    </div>
  `,
  ),

  "05-profile": shell(
    "home",
    `
    <div class="header" style="align-items:center">
      <div style="display:flex;align-items:center;gap:16px">
        <div class="icon-btn" style="width:64px;height:64px;border-radius:20px">←</div>
        <div class="title" style="font-size:40px;margin:0">Profile</div>
      </div>
    </div>
    <div style="display:flex;gap:20px;align-items:center;padding:12px 0 28px">
      <div class="avatar" style="width:100px;height:100px;border-radius:999px;font-size:40px">S</div>
      <div>
        <div style="font-size:34px;font-weight:800">Shehu Usman</div>
        <div style="font-size:24px;color:var(--muted);margin-top:6px">0803 000 0000</div>
      </div>
    </div>
    <div class="card menu">
      <div class="row"><div class="row-left"><div class="ico">👤</div><div class="row-title">Edit profile</div></div><div class="chev">›</div></div>
      <div class="row"><div class="row-left"><div class="ico">🛡</div><div class="row-title">Security & PIN</div></div><div class="chev">›</div></div>
      <div class="row"><div class="row-left"><div class="ico">🎁</div><div class="row-title">Refer & earn</div></div><div class="chev">›</div></div>
      <div class="row"><div class="row-left"><div class="ico">?</div><div class="row-title">Help & support</div></div><div class="chev">›</div></div>
      <div class="row"><div class="row-left"><div class="ico">☾</div><div class="row-title">Dark mode</div></div>
        <div style="width:72px;height:40px;border-radius:999px;background:#cbd5e1;position:relative"><div style="position:absolute;left:4px;top:4px;width:32px;height:32px;border-radius:50%;background:#fff;box-shadow:var(--soft)"></div></div>
      </div>
    </div>
    <div class="section-label" style="margin-top:36px">Legal</div>
    <div class="card menu">
      <div class="row"><div class="row-left"><div class="ico">📄</div><div class="row-title">Privacy policy</div></div><div class="chev">›</div></div>
      <div class="row"><div class="row-left"><div class="ico">📜</div><div class="row-title">Terms of service</div></div><div class="chev">›</div></div>
    </div>
    <div style="margin-top:28px;background:#FCECEA;border-radius:22px;padding:28px 24px;display:flex;gap:16px;align-items:center;color:var(--red);font-size:28px;font-weight:700">
      ⎋ Log out
    </div>
  `,
    { hideNav: true },
  ),
};

fs.mkdirSync(htmlDir, { recursive: true });

for (const [name, html] of Object.entries(screens)) {
  const htmlPath = path.join(htmlDir, `${name}.html`);
  const pngPath = path.join(outDir, `${name}.png`);
  fs.writeFileSync(htmlPath, html, "utf8");
  const fileUrl = "file:///" + htmlPath.replace(/\\/g, "/");
  execFileSync(
    edge,
    [
      "--headless=new",
      "--disable-gpu",
      `--window-size=${W},${H}`,
      `--screenshot=${pngPath}`,
      `--default-background-color=00000000`,
      fileUrl,
    ],
    { stdio: "inherit" },
  );
  console.log("wrote", pngPath);
}

console.log("Done. Screenshots in", outDir);
