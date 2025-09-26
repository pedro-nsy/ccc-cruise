import { redirect } from "next/navigation";
import Link from "next/link";
import { setAdminSession, newSessionId } from "@/lib/adminSession";

export const dynamic = "force-dynamic";

// Top-level Server Action
export async function doLogin(formData: FormData) {
  "use server";
  const input = String(formData.get("password") || "");
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected) {
    redirect("/admin/password?error=" + encodeURIComponent("ADMIN_PASSWORD is not set on the server."));
  }
  if (input !== expected) {
    redirect("/admin/password?error=" + encodeURIComponent("Incorrect password."));
  }
  // Success: set cookie and go to promos
  setAdminSession(newSessionId());
  redirect("/admin/promos");
}

export default async function AdminPasswordPage(props: { searchParams?: Record<string,string|undefined> }) {
  const error = props?.searchParams?.error;

  return (
    <main className="mx-auto max-w-xl sm:max-w-2xl space-y-8 mt-10 px-4">
      <header className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Admin gate</h1>
        <p className="text-neutral-600">Enter the admin password to continue.</p>
      </header>

      <form action={doLogin} className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            name="password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            placeholder="••••••••"
            required
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <Link className="text-sm text-blue-700 hover:underline" href="/admin/login">Use magic link instead</Link>
          <button className="btn btn-primary">Sign in</button>
        </div>
      </form>
    </main>
  );
}
