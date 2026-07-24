"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";

export const BIOMETRIC_UNLOCK_KEY = "ods-biometric-unlock";
export const BIOMETRIC_TRANSACTION_KEY = "ods-biometric-transaction";

type Availability = {
  available: boolean;
  status?: number;
};

type AuthenticateOptions = {
  title?: string;
  subtitle?: string;
  description?: string;
};

type BiometricAuthPlugin = {
  isAvailable(): Promise<Availability>;
  authenticate(options?: AuthenticateOptions): Promise<{ verified: boolean }>;
};

const BiometricAuth = registerPlugin<BiometricAuthPlugin>("BiometricAuth");

export function isNativeBiometricPlatform() {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

export async function getBiometricAvailability(): Promise<Availability> {
  if (!isNativeBiometricPlatform()) return { available: false };
  try {
    return await BiometricAuth.isAvailable();
  } catch {
    return { available: false };
  }
}

export async function authenticateBiometric(options?: AuthenticateOptions) {
  if (!isNativeBiometricPlatform()) return false;
  try {
    const result = await BiometricAuth.authenticate(options);
    return Boolean(result.verified);
  } catch {
    return false;
  }
}

export function readBiometricSetting(key: string, fallback = false) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) === "1";
}

export function writeBiometricSetting(key: string, enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, enabled ? "1" : "0");
}
