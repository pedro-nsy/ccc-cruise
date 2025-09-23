"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Page() {
  const router = useRouter();

  const [adults, setAdults] = useState<number>(2);   // default 2
  const [minors, setMinors] = useState<number>(0);   // default 0
  const [minorAges, setMinorAges] = useState<number[]>([]);

  // keep minorAges array in sync with minors count
  useEffect(() => {
    setMinorAges((prev) => {
      const next = prev.slice(0, minors);
      while (next.length < minors) next.push(0);
      return next;
    });
  }, [minors]);

  const numberOptions = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    // persist to draft
    const draft =
      typeof window !== "undefined" && window.localStorage
        ? JSON.parse(localStorage.getItem("ccc-draft") || "{}")
        : {};
    const next = {
      ...draft,
      groupSize: { adults, minors, minorAges },
    };
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("ccc-draft", JSON.stringify(next));
    }

    router.push("/booking/travelers");
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Who’s sailing with you?</h1>
        <p className="text-neutral-700">
          Please tell us how many <strong>adults</strong> and <strong>minors</strong> are in your group.
        </p>
        <p className="text-neutral-600 text-sm">
          We’ll collect traveler names and details on the next page.  
          Adults are ages 18+, minors are ages 0–17 at the time of sailing.
        </p>
      </header>

      <div className="rounded-2xl border p-6 bg-white space-y-6">
        {/* Adults */}
        <div>
          <label className="block text-sm font-medium">Adults</label>
          <select
            className="mt-2 w-full rounded-xl border px-3 py-2"
            value={adults}
            onChange={(e) => setAdults(parseInt(e.target.value, 10))}
          >
            {numberOptions(0, 10).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">Ages 18 and above.</p>
        </div>

        {/* Minors */}
        <div>
          <label className="block text-sm font-medium">Minors</label>
          <select
            className="mt-2 w-full rounded-xl border px-3 py-2"
            value={minors}
            onChange={(e) => setMinors(parseInt(e.target.value, 10))}
          >
            {numberOptions(0, 10).map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <p className="text-xs text-neutral-500 mt-1">Ages 0–17 at time of sailing.</p>
        </div>

        {/* Minor ages */}
        {minors > 0 && (
          <div className="space-y-4">
            <div className="text-sm font-medium">Minor ages</div>
            {Array.from({ length: minors }).map((_, i) => (
              <div key={i}>
                <label className="block text-xs">Minor {i + 1}</label>
                <select
                  className="mt-1 w-full rounded-xl border px-3 py-2"
                  value={minorAges[i] ?? 0}
                  onChange={(e) => {
                    const v = parseInt(e.target.value, 10);
                    setMinorAges((prev) =>
                      prev.map((x, idx) => (idx === i ? v : x))
                    );
                  }}
                >
                  {numberOptions(0, 17).map((age) => (
                    <option key={age} value={age}>{age}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-neutral-500 text-center">
        You can always review and adjust traveler details later in the booking portal.
      </p>

      <div className="flex items-center justify-between">
        <a href="/booking/group-size" className="btn btn-ghost">Back</a>
        <button type="submit" className="btn btn-primary">Continue</button>
      </div>
    </form>
  );
}


