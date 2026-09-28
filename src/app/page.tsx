"use client";
import { useEffect, useRef, useState } from "react";
import { type Session, type SupabaseClient } from "@supabase/supabase-js";
import { getStarterClient, readAuthCallback, initializeStarterSession } from "@/lib/auth-client";
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
  const identity = useRef<string | null>(null);
  const revision = useRef(0);
  const mounted = useRef(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesError, setNotesError] = useState(false);
  const [reloadNotes, setReloadNotes] = useState(0);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    const lifecycleRevision = revision;
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
        const { data: listener } = sb.auth.onAuthStateChange((_event, next) => { if (active) { if (identity.current !== (next?.user.id ?? null)) { revision.current++; setNotes([]); setBody(""); setNotice(""); setBusy(false); setNotesError(false); setNotesLoading(Boolean(next)); } identity.current = next?.user.id ?? null; setSession(next); } });
        unsubscribe = () => listener.subscription.unsubscribe();
        const result = await initializeStarterSession(sb, callback);
        if (!active) return;
        identity.current = result.session?.user.id ?? null;
        setNotesLoading(Boolean(result.session));
        setClient(sb); setSession(result.session);
        if (result.notice) setNotice(result.notice);
      } catch { if (active) setNotice("Could not load the app configuration or sign-in session. Refresh to retry."); }
      finally { if (active) setReady(true); }
    }
    void initialize();
    return () => { active = false; mounted.current = false; lifecycleRevision.current++; controller.abort(); unsubscribe(); };
  }, []);
  const userId = session?.user.id;
  useEffect(() => {
    if (!client || !userId) return;
    let active = true;
    const owner = userId;
    const ticket = revision.current;
    const controller = new AbortController();
    async function load() {
      try {
        const { data, error } = await client!.from("launch_items").select("id,title").order("created_at", { ascending: false }).abortSignal(controller.signal);
        if (!active || identity.current !== owner || revision.current !== ticket) return;
        if (error) { setNotesError(true); setNotice("Could not load your notes. Try again."); }
        else setNotes(data ?? []);
      } catch { if (active && identity.current === owner && revision.current === ticket) { setNotesError(true); setNotice("Could not load your notes. Try again."); } }
      finally { if (active && identity.current === owner && revision.current === ticket) setNotesLoading(false); }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [client, userId, reloadNotes]);
  async function signIn(e: React.FormEvent) {
    e.preventDefault(); if (!client || busy) return; setBusy(true); setNotice("");
    const ticket = revision.current;
    const current = () => mounted.current && ticket === revision.current;
    try { const { error } = await client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + redirectPath } }); if (current()) setNotice(error ? "Could not send your sign-in link. Try again." : "Check your inbox for your sign-in link."); } catch { if (current()) setNotice("Could not send your sign-in link. Try again."); } finally { if (current()) setBusy(false); }
  }
  async function save(e: React.FormEvent) {
    e.preventDefault(); if (!client || !session || !body.trim() || busy) return; setBusy(true); setNotice("");
    const owner = session.user.id;
    const ticket = revision.current;
    const current = () => mounted.current && identity.current === owner && revision.current === ticket;
    try {
      const { data, error } = await client.from("launch_items").insert({ user_id: owner, title: body.trim() }).select("id,title").single();
      if (!current()) return;
      if (error || !data) setNotice("Could not save your note. Try again.");
      else {
        // Invalidate an older list request before it can replace this newly saved note.
        revision.current++; setBusy(false); setNotesLoading(true); setNotesError(false);
        setNotes(existing => [data, ...existing.filter(note => note.id !== data.id)]); setBody(""); setReloadNotes(value => value + 1);
      }
    } catch { if (current()) setNotice("Could not save your note. Try again."); }
    finally { if (current()) setBusy(false); }
  }
  async function signOut() {
    if (!client || busy) return;
    const ticket = revision.current; const owner = identity.current;
    const current = () => mounted.current && revision.current === ticket && identity.current === owner;
    setBusy(true); setNotice("");
    try { const { error } = await client.auth.signOut(); if (error && current()) setNotice("Could not sign out. Try again."); }
    catch { if (current()) setNotice("Could not sign out. Try again."); }
    finally { if (current()) setBusy(false); }
  }
  return <main className="mx-auto max-w-2xl px-6 py-16"><p className="text-sm text-neutral-500">Built and launched with Launch</p><h1 className="mt-3 text-4xl font-semibold tracking-tight">{appName}</h1><p className="mt-4 text-neutral-600">Your app is live. Sign in to save a private note.</p>
    {!ready ? <p className="mt-8">Loading your session…</p> : !client ? <section className="mt-8 rounded-xl border bg-white p-6"><h2 className="font-medium">Connect your own Supabase project</h2><p className="mt-2 text-sm text-neutral-600">Add your public project URL and publishable key to launch-config.json, apply supabase/schema.sql, and redeploy.</p></section> : !session ? <form onSubmit={signIn} className="mt-8 space-y-3"><label htmlFor="email" className="text-sm font-medium">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com"/><Button disabled={busy}>{busy ? "Sending…" : "Email me a sign-in link"}</Button></form> : <section className="mt-8"><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Signed in as {session.user.email}</p><Button disabled={busy} onClick={signOut}>Sign out</Button></div><form onSubmit={save} className="mt-6 space-y-3"><label htmlFor="note" className="text-sm font-medium">A note only you can read</label><input id="note" value={body} onChange={e => setBody(e.target.value)} required maxLength={500} placeholder="What will you build next?"/><Button disabled={busy}>{busy ? "Working…" : "Save note"}</Button></form><ul className="mt-6 space-y-3">{notes.map(note => <li key={note.id} className="rounded-xl border bg-white p-4">{note.title}</li>)}</ul>{notesLoading && <p role="status" className="mt-4 text-sm">Loading your notes…</p>}{notesError && <Button onClick={() => { setNotice(""); setNotesLoading(true); setNotesError(false); setReloadNotes(value => value + 1); }}>Retry loading notes</Button>}{!notesLoading && !notesError && notes.length === 0 && <p className="mt-4 text-sm text-neutral-500">Your first note belongs here.</p>}</section>}
    {notice && <p role="status" className="mt-4 rounded-lg bg-neutral-100 p-3 text-sm">{notice}</p>}
  </main>;
}
