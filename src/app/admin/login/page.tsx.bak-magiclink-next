"use client";
import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin + "/admin/promos" }});
    if (error) setErr(error.message);
    else setSent(true);
  }

  return (
    <main className="mx-auto max-w-xl sm:max-w-2xl space-y-8 mt-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Admin sign in</h1>
        <p className="text-neutral-700">Use your email to receive a magic link.</p>
      </header>

      <form onSubmit={sendLink} className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            placeholder="you@example.com"
            required
          />
          <p className="text-xs text-neutral-500 mt-1">Access is restricted to approved admin emails.</p>
        </div>

        {err && <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">{err}</div>}
        {sent && <div className="rounded-xl border bg-neutral-50 p-3 text-sm">Check your email for the sign-in link.</div>}

        <div className="flex items-center justify-end">
          <button className="btn btn-primary">{sent ? "Resend link" : "Send link"}</button>
        </div>
      </form>
    </main>
  );
}
