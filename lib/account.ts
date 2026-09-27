import * as Crypto from "expo-crypto";

import { LocalAccount } from "./types";

export const PASSWORD_MIN_LENGTH = 8;

export interface PasswordCheck {
  label: string;
  met: boolean;
}

/** The individual password rules, so the UI can tick them off as the user types. */
export function passwordChecks(password: string): PasswordCheck[] {
  return [
    { label: `At least ${PASSWORD_MIN_LENGTH} characters`, met: password.length >= PASSWORD_MIN_LENGTH },
    { label: "A letter", met: /[A-Za-z]/.test(password) },
    { label: "A number", met: /[0-9]/.test(password) },
    { label: "A special character (e.g. ! @ # $ %)", met: /[^A-Za-z0-9\s]/.test(password) },
  ];
}

export function isPasswordValid(password: string): boolean {
  return passwordChecks(password).every((c) => c.met);
}

export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

async function hashPassword(password: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

export async function buildLocalAccount(email: string, password: string): Promise<LocalAccount> {
  const salt = Array.from(Crypto.getRandomBytes(16), (b) => b.toString(16).padStart(2, "0")).join("");
  return {
    email: email.trim().toLowerCase(),
    passwordHash: await hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
  };
}
