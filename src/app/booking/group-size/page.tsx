"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, startTransition } from "react";

export default function Page() {
  const router = useRouter();
  const [adults, setAdults] = useState<number>(2);
  const [minors, setMinors] = useState<number>(0);
  const [minorAges, setMinorAges] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/booking/has-ref")
      .then((r) => { if (!alive) return; if (r.status === 401) router.replace("/booking/start"); })
      .catch(() => router.replace("/booking/start"));
    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    setMinorAges((prev) => {
      const next = prev.slice(0, minors);
      while (next.length < minors) next.push(0);
      return next;
    });
  }, [minors]);

  const total = useMemo(() => (adults ?? 0) + (minors ?? 0), [adults, minors]);
  const numberOptions = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  function validateLocal() {
    const errs: Record<string, string> = {};
    if (!Number.isInteger(adults) || adults < 1) errs.adults = "At least one adult is required.";
    if (!Number.isInteger(minors) || minors < 0) errs.minors = "Invalid number of minors.";
    if (minors > adults * 3) errs.minors = "You can have up to 3 minors per adult.";
    if (total > 10) errs.total = "For now, the maximum group size is 10 travelers.";
    if ((minors ?? 0) !== (minorAges?.length ?? 0)) errs.minorAges = "Please specify each minor's age.";
    for (const age of minorAges) {
      if (!Number.isInteger(age) || age < 0 || age > 17) {
        errs.minorAges = "Each minor's age must be between 0 and 17.";
        break;
      }
    }
    return errs;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validateLocal();
    setErrors(v);
    if (Object.keys(v).length) return;

    setLoading(true);
    try {
      const res = await fetch("/api/booking/group-size", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adults, minors, minorAges }),
      });

      // Dev breadcrumb
      console.log("group-size → POST status", res.status);

      if (res.status === 400) {
        const data = await res.json().catch(() => ({} as any));
        if (data?.error === "MISSING_REF") return router.replace("/booking/start");
        if (data?.errors) setErrors(data.errors);
        return;
      }
      if (!res.ok) return;

      // Robust navigation: client push + fallback hard redirect
      startTransition(() => router.push("/booking/travelers"));
      setTimeout(() => {
        if (typeof window !== "undefined" && window.location.pathname.includes("/booking/group-size")) {
          window.location.assign("/booking/travelers");
        }
      }, 200);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Who’s sailing with you?</h1>
        <p className="text-neutral-700">
          Please tell us how many <strong>adults</strong> and <strong>minors</strong> are in your group.
        </p>
        <p className="text-neutral-600 text-sm">
          We’ll collect traveler names and details on the next page. Adults are ages 18+, minors are ages 0–17 at the time of sailing.
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Adults</label>
          <select
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value, 10))}
          >
            {numberOptions(0, 10).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">Ages 18 and above.</p>
          {errors.adults && <p className="text-xs text-red-700 mt-1">{errors.adults}</p>}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Minors</label>
          <select
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
            value={minors}
            onChange={(e) => setMinors(parseInt(e.target.value, 10))}
          >
            {numberOptions(0, 10).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">Ages 0–17 at time of sailing. Up to 3 minors per adult.</p>
          {errors.minors && <p className="text-xs text-red-700 mt-1">{errors.minors}</p>}
        </div>

        {minors > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Minor ages</div>
            {Array.from({ length: minors }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs">Minor {i + 1}</label>
                <select
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                  value={minorAges[i] ?? 0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMinorAges((prev) => prev.map((x, idx) => (idx === i ? v : x)));
                  }}
                >
                  {numberOptions(0, 17).map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            ))}
            {errors.minorAges && <p className="text-xs text-red-700 mt-1">{errors.minorAges}</p>}
          </div>
        )}

        <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
          <div className="flex items-center justify-between">
            <div>Total travelers</div>
            <div className="font-medium">{total} (Adults {adults}, Minors {minors})</div>
          </div>
          {errors.total && <p className="text-xs text-red-700 mt-2">{errors.total}</p>}
        </div>
      </div>

      <p className="text-xs text-neutral-500 text-center">
        You can review and adjust traveler details on the next step.
      </p>

      <div className="flex items-center justify-between">
        <a href="/booking/start" className="btn btn-ghost">Back</a>
        <button type="submit" disabled={loading} className="btn btn-primary disabled:opacity-60">
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </form>
  );
}
