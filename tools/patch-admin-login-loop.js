const fs = require("fs");
const path = require("path");

function backupWrite(file, content, tag){
  const dir = path.dirname(file);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const bak = file + ".bak-" + tag;
  if (fs.existsSync(file) && !fs.existsSync(bak)) fs.copyFileSync(file, bak);
  fs.writeFileSync(file, content, "utf8");
  console.log("✓ wrote", file, "backup:", fs.existsSync(bak) ? bak : "(none)");
}

/* --- A) admin layout: never redirect /admin/login; only redirect other /admin/* when signed-out --- */
const layoutFile = path.join("src","app","admin","layout.tsx");
const layoutContent = `"use client";
import { ReactNode, useEffect, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let on = true;
    (async () => {
      // Never redirect the login page itself (prevents /admin/login?next=/admin/login recursion)
      if (pathname === "/admin/login") {
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!on) return;

      const hasSession = !!data.session;
      if (!hasSession) {
        const next = pathname + (sp && sp.toString() ? \`?\${sp.toString()}\` : "");
        router.replace(\`/admin/login?next=\${encodeURIComponent(next)}\`);
      } else {
        setReady(true);
      }
    })();
    return () => { on = false; };
  }, [pathname, sp, router]);

  if (!ready) return null;
  return <>{children}</>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AdminGate>{children}</AdminGate>
    </Suspense>
  );
}
`;

/* --- B) admin login: sanitize next; if missing or points to /admin/login, default to /admin/promos --- */
const loginFile = path.join("src","app","admin","login","page.tsx");
const loginContent = `"use client";
import { useState, useMemo, Suspense } from "react";
import { createClient } from "@supabase/supabase-js";
import { useSearchParams } from "next/navigation";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

function LoginInner() {
  const sp = useSearchParams();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  // Sanitize next: allow only internal admin pages; avoid /admin/login to prevent nesting
  const nextPath = useMemo(() => {
    const raw = (sp?.get("next") || "").trim();
    try {
      // Decode once so we recognize already-encoded values
      const decoded = raw ? decodeURIComponent(raw) : "";
      const candidate = decoded || "/admin/promos";
      if (candidate.startsWith("/admin/") && !candidate.startsWith("/admin/login")) {
        return candidate;
      }
      return "/admin/promos";
    } catch {
      return "/admin/promos";
    }
  }, [sp]);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    const redirectTo = window.location.origin + nextPath;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });
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

export default function AdminLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
`;

backupWrite(layoutFile, layoutContent, "login-loop-fix");
backupWrite(loginFile, loginContent, "login-loop-fix");
