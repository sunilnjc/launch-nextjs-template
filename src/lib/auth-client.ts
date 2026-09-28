import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { LaunchConfig } from "./launch-config";
let browserClient: { url: string; key: string; client: SupabaseClient } | undefined;
/** Share one client across remounts: Supabase handles the callback URL exactly once per instance. */
export function getStarterClient(config: LaunchConfig): SupabaseClient {
  if (!browserClient || browserClient.url !== config.supabaseUrl || browserClient.key !== config.supabaseAnonKey) {
    browserClient = { url: config.supabaseUrl, key: config.supabaseAnonKey, client: createClient(config.supabaseUrl, config.supabaseAnonKey) };
  }
  return browserClient.client;
}
export type AuthCallbackState = { isCallback: boolean; failed: boolean };
export function readAuthCallback(): AuthCallbackState {
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(url.hash.slice(1));
  return { isCallback: url.pathname === "/auth/callback" || url.pathname === "/auth/callback/", failed: hash.has("error") || hash.has("error_code") || url.searchParams.has("error") || url.searchParams.has("error_code") };
}
export function finishAuthCallback(state: AuthCallbackState, hasSession: boolean, hasError: boolean): string {
  if (state.isCallback) {
    // Remove codes, access tokens and provider error text from browser history after handling.
    window.history.replaceState(null, "", "/");
    if (state.failed || hasError || !hasSession) return "This sign-in link expired or was already used. Request a new link.";
  }
  return hasError ? "Could not restore your sign-in session. Request a new sign-in link." : "";
}
