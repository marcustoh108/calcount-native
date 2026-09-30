import type { AuthError } from "@supabase/supabase-js";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { serverMode, supabase } from "./supabase";

export type SignUpOutcome = "signed_in" | "confirm_email";

interface AuthState {
  /** False in local mode (no server configured). */
  serverMode: boolean;
  ready: boolean;
  /** The signed-in email, or null. Always null in local mode. */
  email: string | null;
  signUp: (email: string, password: string) => Promise<SignUpOutcome>;
  /** Confirms a new account with the code from the sign-up email. */
  confirmSignUp: (email: string, code: string) => Promise<void>;
  resendSignUpCode: (email: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordResetCode: (email: string) => Promise<void>;
  /** Signs in with the emailed reset code, then sets the new password. */
  resetPassword: (email: string, code: string, newPassword: string) => Promise<void>;
}

const AuthReactContext = createContext<AuthState | null>(null);

export class AuthFailure extends Error {}

/** Turns Supabase auth errors into sentences a person can act on. */
function friendly(error: AuthError | null): never | void {
  if (!error) return;
  const message = error.message.toLowerCase();
  if (message.includes("invalid login credentials")) {
    throw new AuthFailure("That email and password don't match. Check them, or reset your password.");
  }
  if (message.includes("email not confirmed")) {
    throw new AuthFailure("Please confirm your email first, using the code we sent you.");
  }
  if (message.includes("already registered") || message.includes("already been registered")) {
    throw new AuthFailure("An account with this email already exists. Sign in instead.");
  }
  if (message.includes("expired") || message.includes("otp")) {
    throw new AuthFailure("That code is wrong or has expired. Request a new one and try again.");
  }
  if (message.includes("rate limit") || error.status === 429) {
    throw new AuthFailure("Too many attempts. Please wait a few minutes and try again.");
  }
  if (message.includes("password")) {
    throw new AuthFailure(error.message);
  }
  throw new AuthFailure("Something went wrong. Check your connection and try again.");
}

function requireClient() {
  if (!supabase) throw new AuthFailure("No YumBalance server is configured.");
  return supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!serverMode);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signUp = useCallback(async (address: string, password: string): Promise<SignUpOutcome> => {
    const { data, error } = await requireClient().auth.signUp({ email: address.trim().toLowerCase(), password });
    friendly(error);
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0) {
      throw new AuthFailure("An account with this email already exists. Sign in instead.");
    }
    return data.session ? "signed_in" : "confirm_email";
  }, []);

  const confirmSignUp = useCallback(async (address: string, code: string) => {
    const { error } = await requireClient().auth.verifyOtp({
      email: address.trim().toLowerCase(),
      token: code.trim(),
      type: "email",
    });
    friendly(error);
  }, []);

  const resendSignUpCode = useCallback(async (address: string) => {
    const { error } = await requireClient().auth.resend({ type: "signup", email: address.trim().toLowerCase() });
    friendly(error);
  }, []);

  const signIn = useCallback(async (address: string, password: string) => {
    const { error } = await requireClient().auth.signInWithPassword({ email: address.trim().toLowerCase(), password });
    friendly(error);
  }, []);

  const signOut = useCallback(async () => {
    await requireClient().auth.signOut();
  }, []);

  const sendPasswordResetCode = useCallback(async (address: string) => {
    const { error } = await requireClient().auth.resetPasswordForEmail(address.trim().toLowerCase());
    friendly(error);
  }, []);

  const resetPassword = useCallback(async (address: string, code: string, newPassword: string) => {
    const client = requireClient();
    const { error } = await client.auth.verifyOtp({
      email: address.trim().toLowerCase(),
      token: code.trim(),
      type: "recovery",
    });
    friendly(error);
    const { error: updateError } = await client.auth.updateUser({ password: newPassword });
    friendly(updateError);
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      serverMode,
      ready,
      email,
      signUp,
      confirmSignUp,
      resendSignUpCode,
      signIn,
      signOut,
      sendPasswordResetCode,
      resetPassword,
    }),
    [ready, email, signUp, confirmSignUp, resendSignUpCode, signIn, signOut, sendPasswordResetCode, resetPassword],
  );

  return <AuthReactContext.Provider value={value}>{children}</AuthReactContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthReactContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
