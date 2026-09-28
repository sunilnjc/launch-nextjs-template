export type LaunchConfig = { appName: string; supabaseUrl: string; supabaseAnonKey: string; authRedirectPath: string };
export async function loadLaunchConfig(signal: AbortSignal): Promise<LaunchConfig> {
  let raw: Record<string, unknown> = {};
  const response = await fetch("/launch-config.json", { cache: "no-store", signal, credentials: "omit" });
  if (response.ok) {
    const value: unknown = await response.json();
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid public app configuration");
    raw = value as Record<string, unknown>;
  } else if (response.status !== 404) throw new Error("App configuration unavailable");
  const appName = typeof raw.appName === "string" ? raw.appName.slice(0, 150) : "";
  const supabaseUrl = typeof raw.supabaseUrl === "string" ? raw.supabaseUrl : process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseAnonKey = typeof raw.supabaseAnonKey === "string" ? raw.supabaseAnonKey : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const authRedirectPath = typeof raw.authRedirectPath === "string" ? raw.authRedirectPath : "/auth/callback";
  if (!["/auth/callback", "/auth/callback/"].includes(authRedirectPath)) throw new Error("Auth redirect must use the included /auth/callback route");
  if (supabaseUrl || supabaseAnonKey) {
    const url = new URL(supabaseUrl);
    const loopback = (host: string) => host === "localhost" || host === "127.0.0.1";
    const localDevelopment = typeof window !== "undefined" && loopback(window.location.hostname) && loopback(url.hostname);
    if ((url.protocol !== "https:" && !(url.protocol === "http:" && localDevelopment)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error("Invalid Supabase project URL");
    if (supabaseAnonKey.startsWith("sb_secret_")) throw new Error("Private Supabase keys must never be public");
    if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(supabaseAnonKey)) {
      try {
        const encoded = supabaseAnonKey.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        const payload = JSON.parse(atob(encoded)) as { role?: string };
        if (payload.role !== "anon") throw new Error("A public anon key is required");
      } catch { throw new Error("A valid publishable or anon key is required"); }
    }
  }
  return { appName, supabaseUrl, supabaseAnonKey, authRedirectPath };
}
