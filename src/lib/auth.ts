import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "ods-dev-secret-change-me";
if (!process.env.JWT_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("JWT_SECRET is not set");
}

export async function hashPin(pin: string) {
  return bcrypt.hash(pin, 10);
}

export async function comparePin(pin: string, hash: string) {
  return bcrypt.compare(pin, hash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  // Practical email check (not full RFC)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function validatePassword(password: string): { ok: true } | { ok: false; error: string } {
  if (!password || password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters" };
  }
  if (password.length > 72) {
    return { ok: false, error: "Password is too long" };
  }
  return { ok: true };
}

export function signSession(userId: string) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "30d" });
}

export function verifySession(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

/** Short-lived token after reset_pin OTP — allows setting a new PIN. */
export function signResetToken(phone: string) {
  return jwt.sign({ phone, purpose: "reset_pin" }, JWT_SECRET, { expiresIn: "10m" });
}

export function verifyResetToken(token: string): { phone: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { phone?: string; purpose?: string };
    if (payload.purpose !== "reset_pin" || !payload.phone) return null;
    return { phone: payload.phone };
  } catch {
    return null;
  }
}

export function generateOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function generateReferralCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "USER";
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}${suffix}`;
}

export function generateTxnReference() {
  return `ODS-${Date.now()}${Math.floor(Math.random() * 1000)}`;
}
