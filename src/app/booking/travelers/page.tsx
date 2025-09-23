"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Lead = {
  booking_ref: string;
  status: string;
  adults: number | null;
  minors: number | null;
  minor_ages: number[] | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
};

export default function TravelersPage() {
  const router = useRouter();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const has = await fetch("/api/booking/has-ref");
        if (has.status === 401) {
          router.replace("/booking/start");
          return;
        }
        const res = await fetch("/api/booking/current");
        if (res.status === 401) {
          router.replace("/booking/start");
          return;
        }
        if (!res.ok) {
          const data = await res.json().catch(() => ({} as any));
          setErr(data?.error || "Failed to load booking.");
          return;
        }
        const data = await res.json();
        if (alive) setLead(data.lead as Lead);
      } catch (e: any) {
        if (alive) setErr("Network error loading booking.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false };
  }, [router]);

  if (loading) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-semibold">Travelers</h1>
          <p className="text-neutral-700">Loading your booking…</p>
        </header>
        <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
        <header className="text-center space-y-3">
          <h1 className="text-2xl md:text-3xl font-semibold">Travelers</h1>
          <p className="text-neutral-700">We couldn’t load your booking.</p>
        </header>
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">{err}</div>
        <div className="flex items-center justify-between">
          <a href="/booking/group-size" className="btn btn-ghost">Back</a>
          <a href="/booking/start" className="btn btn-primary">Start again</a>
        </div>
      </div>
    );
  }

  const adults = lead?.adults ?? 0;
  const minors = lead?.minors ?? 0;
  const ages = Array.isArray(lead?.minor_ages) ? lead!.minor_ages! : [];

  return (
    <div className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Travelers</h1>
        <p className="text-neutral-700">We’ll collect traveler names and details here.</p>
        <p className="text-neutral-600 text-sm">For now this is a placeholder to confirm navigation and data flow.</p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="text-neutral-600">Booking ref</div>
          <div className="font-medium">{lead?.booking_ref}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-neutral-600">Status</div>
          <div className="font-medium">{lead?.status}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-neutral-600">Adults</div>
          <div className="font-medium">{adults}</div>
        </div>
        <div className="flex items-center justify-between text-sm">
          <div className="text-neutral-600">Minors</div>
          <div className="font-medium">{minors}</div>
        </div>
        {minors > 0 && (
          <div className="text-sm">
            <div className="text-neutral-600 mb-1">Minor ages</div>
            <div className="font-medium">{ages.join(", ")}</div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <a href="/booking/group-size" className="btn btn-ghost">Back</a>
        <button disabled className="btn btn-primary disabled:opacity-60">Continue</button>
      </div>
    </div>
  );
}
