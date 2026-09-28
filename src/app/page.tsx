"use client";
import { useEffect, useState } from "react";
import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getStarterClient, readAuthCallback, finishAuthCallback } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
type Note = { id: string; title: string };
import { loadLaunchConfig } from "@/lib/launch-config";
export default function Home() {
  const [appName, setAppName] = useState("Your app");
  const [client, setClient] = useState<SupabaseClient | null>(null);
  const [redirectPath, setRedirectPath] = useState("/auth/callback");
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [notes, setNotes] = useState<Note[]>([]);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    let unsubscribe = () => {};
    const controller = new AbortController();
    async function initialize() {
      try {
        const config = await loadLaunchConfig(controller.signal);
        if (!active) return;
        setAppName(config.appName || "Your app");
        document.title = config.appName || "Your app";
        setRedirectPath(config.authRedirectPath);
        if (!config.supabaseUrl || !config.supabaseAnonKey) { setReady(true); return; }
        const callback = readAuthCallback();
        const sb = getStarterClient(config);
        const { data: listener } = sb.auth.onAuthStateChange((_event, next) => { if (active) { setSession(next); if (!next) setNotes([]); } });
        unsubscribe = () => listener.subscription.unsubscribe();
        const { data, error } = await sb.auth.getSession();
        if (!active) return;
        setClient(sb); setSession(data.session);
        const authNotice = finishAuthCallback(callback, Boolean(data.session), Boolean(error));
        if (authNotice) setNotice(authNotice);
      } catch { if (active) setNotice("Could not load the app configuration or sign-in session. Refresh to retry."); }
      finally { if (active) setReady(true); }
    }
    void initialize();
    return () => { active = false; controller.abort(); unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!client || !session) return;
    client.from("launch_items").select("id,title").order("created_at", { ascending: false }).then(({ data, error }) => { if (error) setNotice(error.message); else setNotes(data ?? []); });
  }, [client, session]);
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); if (!client) return; setBusy(true); setNotice("");
    try { const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + redirectPath } }); setNotice(error?.message ?? "Check your inbox for your sign-in link."); } catch { setNotice("Could not send your sign-in link. Try again."); } finally { setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!client || !session || !body.trim()) return; setBusy(true); setNotice("");
    try { const { data, error } = await client.from("launch_items").insert({ user_id: session.user.id, title: body.trim() }).select("id,title").single(); if (error) setNotice(error.message); else { setNotes([data, ...notes]); setBody(""); } } catch { setNotice("Could not save your note. Try again."); } finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl px-6 py-16"><p className="text-sm text-neutral-500">Built and launched with Launch</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{appName}</h1><p className="mt-4 text-neutral-600">Your app is live. Sign in to save a private note.</p>
    {!ready ? <p className="mt-8">Loading your session…</p> : !client ? <section className="mt-8 rounded-xl border bg-white p-6"><h2 className="font-medium">Connect your own Supabase project</h2><p className="mt-2 text-sm text-neutral-600">Add your public project URL and publishable key to launch-config.json, apply supabase/schema.sql, and redeploy.</p></section> : !session ? <form onSubmit={signIn} className="mt-8 space-y-3"><label htmlFor="email" className="text-sm font-medium">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/><Button disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</Button></form> : <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Signed in as {session.user.email}</p><Button onClick={async () => { const { error } = await client.auth.signOut(); if (error) setNotice(error.message); }}>Sign out</Button></div><form onSubmit={save} className="mt-6 space-y-3"><label htmlFor="note" className="text-sm font-medium">A note only you can read</label><input id="note" value={body} onChange={e => setBody(e.target.value)} required maxLength={500} placeholder="What will you build next?"/><Button disabled={busy}>{busy ? "Saving…" : "Save note"}</Button></form><ul className="mt-6 space-y-3">{notes.map(note => <li key={note.id} className="rounded-xl border bg-white p-4">{note.title}</li>)}</ul>{notes.length === 0 && <p className="mt-4 text-sm text-neutral-500">Your first note belongs here.</p>}</section>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm">{notice}</p>}
  </main>;
}
