# Your Launch app

Next.js, TypeScript, Tailwind, a shadcn-compatible button and Supabase magic links.

## Run

Run `npm install`, copy `.env.example` to `.env.local`, add your NEW Supabase project URL and publishable anon key, then `npm run dev`. Open http://localhost:4319. Never place a service-role key in a NEXT_PUBLIC variable. Local Supabase may use HTTP only when both the app and Supabase run on localhost or 127.0.0.1; production requires HTTPS.

Apply `supabase/schema.sql` in your own Supabase project. In Authentication URL Configuration, set Site URL to the live URL and add the live /auth/callback URL and http://localhost:4319/auth/callback as redirect URLs. The magic link returns to the generated callback page and the Supabase browser client establishes the session before returning to the app.

## Cloudflare Pages

Launch creates a [Direct Upload Pages project](https://developers.cloudflare.com/pages/get-started/direct-upload/). Use the wizard’s optional automatic-deployment connection to install a dedicated GitHub Actions workflow in this repository, or upload the built out directory with Wrangler. Both deploy to the same Pages project. Build command: `npm run build`. Output: `out`. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as build environment variables and redeploy. Alternatively copy `public/launch-config.example.json` to `public/launch-config.json` and supply your app name, public project URL and publishable/anon key. Runtime configuration takes precedence. The Launch direct-deploy flow inserts that public JSON after the generic build, so every user gets their own project without rebuilding. Never put a service-role key in this file. Keep `authRedirectPath` as `/auth/callback` for the included magic-link handler. This static export uses Supabase directly with RLS; no server-only routes are required.

Browser requirements: modern browsers with AbortSignal.timeout and AbortSignal.any. Supabase requests have a 15-second native deadline that remains active while response bodies are read; caller cancellation is preserved. The wrapper adds no retries. SDK retries and authentication lock waits are separate and can make a complete operation last longer.

No deployment workflows, provider secrets, service-role keys or shared founder credentials are included.
