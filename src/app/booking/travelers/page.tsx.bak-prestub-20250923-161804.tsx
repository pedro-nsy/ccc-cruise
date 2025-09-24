"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PromoType = "ARTIST" | "CCC_STAFF" | "SBS_STAFF";
type PromoResult = { code: string; type: PromoType | null; valid: boolean; message: string };
type PromoFlags = { hasSbs: boolean; hasArtist: boolean; hasCcc: boolean; mixBlocked: boolean; anyInvalid: boolean };

type Traveler = {
  fullName: string;
  dob: string;
  nationality: string;
  isAdult: boolean;
  minorAge?: number;
  applyPromo?: "yes" | "no";
  promoCode?: string | null;
};

// Countries: Mexico first, then alpha list
const COUNTRY_ALPHA = [
  "Algeria","Argentina","Australia","Austria","Bahrain","Bangladesh","Belgium","Brazil","Canada","Chile","China","Colombia","Costa Rica","Cuba","Czech Republic","Denmark","Dominican Republic","Egypt","El Salvador","Ethiopia","Finland","France","Germany","Ghana","Greece","Guatemala","Honduras","Hong Kong","Hungary","Iceland","India","Indonesia","Ireland","Israel","Italy","Japan","Jordan","Kenya","Kuwait","Laos","Lebanon","Malaysia","Morocco","Netherlands","New Zealand","Nigeria","Norway","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Saudi Arabia","Singapore","South Africa","South Korea","Spain","Sri Lanka","Sweden","Switzerland","Taiwan","Thailand","Tunisia","Turkey","United Arab Emirates","United Kingdom","United States","Uruguay","Venezuela","Vietnam"
];
const COUNTRIES = ["Mexico", ...COUNTRY_ALPHA];

export default function Page() {
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [adults, setAdults] = useState(0);
  const [minors, setMinors] = useState(0);
  const [minorAges, setMinorAges] = useState<number[]>([]);
  const [hasPromo, setHasPromo] = useState(false);
  const [promoFlags, setPromoFlags] = useState<PromoFlags | null>(null);
  const [promoResults, setPromoResults] = useState<PromoResult[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");

    const gs = draft?.groupSize || {};
    setAdults(Number(gs?.adults ?? 0));
    setMinors(Number(gs?.minors ?? 0));
    setMinorAges(Array.isArray(gs?.minorAges) ? gs.minorAges : []);

    const intent = draft?.intent || {};
    setHasPromo(Boolean(intent?.hasPromo));
    setPromoFlags(intent?.promoFlags ?? null);
    setPromoResults(Array.isArray(intent?.promoResolved) ? intent.promoResolved : []);

    const targetLen = Number(gs?.adults ?? 0) + Number(gs?.minors ?? 0);
    const saved = Array.isArray(draft?.travelers) ? draft.travelers : null;
    if (saved && saved.length === targetLen) {
      setTravelers(saved);
    } else {
      const base: Traveler[] = [];
      for (let i = 0; i < (gs?.adults ?? 0); i++) {
        base.push({ fullName: "", dob: "", nationality: "Mexico", isAdult: true, applyPromo: "no", promoCode: null });
      }
      for (let j = 0; j < (gs?.minors ?? 0); j++) {
        base.push({ fullName: "", dob: "", nationality: "Mexico", isAdult: false, minorAge: (gs?.minorAges?.[j] ?? 0), applyPromo: "no", promoCode: null });
      }
      setTravelers(base);
    }

    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (hasPromo && (!promoResults.length || !promoFlags || promoFlags.anyInvalid || promoFlags.mixBlocked)) {
      router.replace("/booking/group-size");
    }
  }, [loaded, hasPromo, promoResults, promoFlags, router]);

  // Unique list of valid, non-SBS codes → each 1-time usable
  const promoOptions = useMemo(() => {
    if (!hasPromo || promoFlags?.hasSbs) return [];
    const seen = new Set<string>();
    return promoResults
      .filter(r => r.valid && r.type && r.type !== "SBS_STAFF")
      .filter(r => {
        const key = r.code.toUpperCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [hasPromo, promoFlags, promoResults]);

  // availability: every listed non-SBS code = 1 allowed use
  const availability = useMemo(() => {
    const map = new Map<string, number>();
    promoOptions.forEach(r => map.set(r.code.toUpperCase(), 1));
    return map;
  }, [promoOptions]);

  // assignments count across travelers
  const assignedCounts = useMemo(() => {
    const map = new Map<string, number>();
    travelers.forEach(t => {
      if (t.promoCode) {
        const key = t.promoCode.toUpperCase();
        map.set(key, (map.get(key) ?? 0) + 1);
      }
    });
    return map;
  }, [travelers]);

  const update = (idx: number, patch: Partial<Traveler>) =>
    setTravelers(rows => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  const labelFor = (index: number) => {
    if (index < adults) return `Adult #${index + 1}`;
    const minorIdx = index - adults;
    const years = travelers[index]?.minorAge ?? minorAges[minorIdx] ?? 0;
    return `Minor #${minorIdx + 1} (${years} year${years === 1 ? "" : "s"} old)`;
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    for (const t of travelers) {
      if (!t.fullName || !t.dob || !t.nationality) {
        alert("Please complete full name, date of birth, and nationality for every traveler.");
        return;
      }
    }

    // enforce one-time use per code
    const overUsed: string[] = [];
    for (const [code, max] of availability.entries()) {
      const used = assignedCounts.get(code) ?? 0;
      if (used > max) overUsed.push(`${code} (${used}/${max})`);
    }
    if (overUsed.length) {
      alert(
        "Promo code usage exceeded:\n" +
        overUsed.map(v => `• ${v}`).join("\n") +
        "\n\nEach promo code can be used once per booking (non-SBS)."
      );
      return;
    }

    if (typeof window !== "undefined" && window.localStorage) {
      const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
      // Save names as uppercase
      const uppered = travelers.map(t => ({ ...t, fullName: (t.fullName || "").toUpperCase() }));
      localStorage.setItem("ccc-draft", JSON.stringify({ ...draft, travelers: uppered }));
    }
    router.push("/booking/cabins");
  };

  if (!loaded) return null;

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Add traveler details</h1>
        <p className="text-neutral-700">
          We’ve created one section per traveler based on your previous selection.
        </p>
        <p className="text-neutral-600 text-sm">
          Enter the full legal name, date of birth, and nationality for each traveler.
          If you validated promo codes earlier, you can assign <strong>one</strong> code per traveler here.
        </p>
      </header>

      {promoFlags?.hasSbs && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
          <strong>SBS booking:</strong> An SBS Staff code was provided. Promo selection is disabled because SBS is booking-wide. All travelers will be marked SBS Staff.
        </div>
      )}

      <div className="space-y-4">
        {travelers.map((t, i) => {
          const key = (t.promoCode ?? "").toUpperCase();
          const max = availability.get(key) ?? 0;
          const used = assignedCounts.get(key) ?? 0;

          // Split name into first/last (kept in one fullName string)
          const parts = (t.fullName || "").trim().split(/\s+/);
          const firstNow = parts.slice(0, -1).join(" ");
          const lastNow = parts.slice(-1).join(" ");

          return (
            <div key={i} className="rounded-2xl border p-6 bg-white space-y-4">
              <div className="text-sm font-medium">{labelFor(i)}</div>

              {/* First & Last names side-by-side, uppercase while typing */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium">First name(s)</label>
                  <input
                    className="mt-2 w-full rounded-xl border px-3 py-2 uppercase"
                    placeholder="First name(s)"
                    value={firstNow}
                    onChange={(e) => {
                      const v = (e.target.value || "").toUpperCase();
                      const next = `${v} ${lastNow}`.replace(/\s+/g," ").trim();
                      update(i, { fullName: next });
                    }}
                    required
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium">Last name(s)</label>
                  <input
                    className="mt-2 w-full rounded-xl border px-3 py-2 uppercase"
                    placeholder="Last name(s)"
                    value={lastNow}
                    onChange={(e) => {
                      const v = (e.target.value || "").toUpperCase();
                      const next = `${firstNow} ${v}`.replace(/\s+/g," ").trim();
                      update(i, { fullName: next });
                    }}
                    required
                    autoComplete="family-name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium">Date of birth</label>
                <input
                  type="date"
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  value={t.dob}
                  onChange={(e) => update(i, { dob: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Nationality</label>
                <select
                  className="mt-2 w-full rounded-xl border px-3 py-2"
                  value={t.nationality || "Mexico"}
                  onChange={(e) => update(i, { nationality: e.target.value })}
                  required
                >
                  {COUNTRIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Per-traveler promo selection (non-SBS only) */}
              {hasPromo && !promoFlags?.hasSbs && promoOptions.length > 0 && (
                <div className="pt-2">
                  <label className="block text-sm font-medium">Apply a promo code to this traveler?</label>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => update(i, { applyPromo: "yes" })}
                      className={`rounded-xl border px-3 py-2 ${t.applyPromo === "yes" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => update(i, { applyPromo: "no", promoCode: null })}
                      className={`rounded-xl border px-3 py-2 ${t.applyPromo !== "yes" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
                    >
                      No
                    </button>
                  </div>

                  {t.applyPromo === "yes" && (
                    <div className="mt-3">
                      <label className="block text-sm font-medium">Select a promo code</label>
                      <select
                        className="mt-2 w-full rounded-xl border px-3 py-2 uppercase"
                        value={t.promoCode ?? ""}
                        onChange={(e) => update(i, { promoCode: e.target.value || null })}
                      >
                        <option value="">— Choose a code —</option>
                        {promoOptions.map((r) => (
                          <option key={r.code} value={r.code}>
                            {r.code} · {r.type === "ARTIST" ? "Artist" : "CCC Staff"}
                          </option>
                        ))}
                      </select>
                      {t.promoCode && (
                        <p className={"text-xs mt-1 " + (used > max ? "text-red-600" : "text-neutral-500")}>
                          Usage for {key || "—"}: {Math.min(used, max)}/{max || 0}{used > max ? " (too many assigned)" : ""}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!t.isAdult && (
                <p className="text-xs text-neutral-500">Reminder: You selected {t.minorAge ?? 0} year(s) old for this minor on the previous step.</p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-neutral-500 text-center">
        You can review traveler details and promo assignments before payment.
      </p>

      <div className="flex items-center justify-between">
        <a href="/booking/group-size" className="btn btn-ghost">Back</a>
        <button type="submit" className="btn btn-primary">Continue</button>
      </div>
    </form>
  );
}


