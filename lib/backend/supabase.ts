import "react-native-url-polyfill/auto";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { AppState } from "react-native";

/**
 * CalCount's server connection. Set both values in `.env.local` (see docs/SERVER_SETUP.md).
 * When they're missing the app runs in local mode: accounts and the scan limit live on the
 * phone, and scans use the user's own Anthropic key or demo results.
 */
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

/** True when a CalCount server is configured, so scans and accounts go through it. */
export const serverMode = supabase != null;

// Refresh the login token only while the app is in the foreground (Supabase's React Native guidance).
if (supabase) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
