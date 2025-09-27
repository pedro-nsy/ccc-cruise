"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Traveler = {
  idx: number;
  is_adult: boolean;
  minor_age: number | null;
  first_name: string | null;
  last_name: string | null;
  dob: string | null; // YYYY-MM-DD
  nationality_code: string | null;
  promo: null | { code: string; type: "staff" | "artist" | "early_bird" };
};

type Country = { code: string; name: string; priority: number };

const SAIL_START = "2026-04-05";
const SAIL_END = "2026-04-12";

function toUTCDate(d: string) { return new Date(d + "T00:00:00Z"); }
function ageOn(dateISO: string, dobISO: string) {
  const d = toUTCDate(dateISO);
  const b = toUTCDate(dobISO);
  let age = d.getUTCFullYear() - b.getUTCFullYear();
  const m = d.getUTCMonth() - b.getUTCMonth();
  if (m < 0 || (m === 0 && d.getUTCDate() < b.getUTCDate())) age--;
  return age;
}

function promoExplainer(t: "staff" | "artist" | "early_bird") {
  if (t === "staff") return "Staff: Interior is MXN 0 per person; if you choose another category later, you pay only the difference vs Interior.";
  if (t === "artist") return "Artist: 50% off the public per-person price (any category/occupancy).";
  return "Early Bird: 15% off the public per-person price (any category/occupancy).";
}

export default function TravelersPage() {
  const router = useRouter();
  const [countries, setCountries] = useState<Country[]>([]);
  const [travelers, setTravelers] = useState<Traveler[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<null | "ok" | "fail">(null);

  // Promo UI state
  const [promoInputs, setPromoInputs] = useState<Record<number, string>>({});
  const [promoMsgs, setPromoMsgs] = useState<Record<number, string>>({});
  const [wantsPromo, setWantsPromo] = useState<Record<number, boolean>>({}); 
  // Refs: map traveler idx -> card element for scroll/focus on errors
  const cardRefs = useRef<Record<number, HTMLDivElement | null>>({});
// checkbox per traveler

  // Guard + load
  useEffect(() => {
    let alive = true;
    (async () => {
      const has = await fetch("/api/booking/has-ref");
      if (has.status === 401) { router.replace("/booking/start"); return; }

      const [cRes, tRes] = await Promise.all([
        fetch("/api/booking/countries"),
        fetch("/api/booking/travelers"),
      ]);

      if (cRes.ok) {
        const c = await cRes.json();
        if (alive) setCountries(c.countries || []);
      }
      if (tRes.ok) {
        const t = await tRes.json();
        const list: Traveler[] = t.travelers || [];
        if (alive) {
          setTravelers(list);
          const seedInputs: Record<number, string> = {};
          const seedWants: Record<number, boolean> = {};
          for (const tr of list) {
            if (tr.promo?.code) {
              seedInputs[tr.idx] = tr.promo.code;
              seedWants[tr.idx] = true;
            } else {
              seedWants[tr.idx] = false; // default unchecked unless a promo is already attached
            }
          }
          setPromoInputs(seedInputs);
          setWantsPromo(seedWants);
        }
      }
    })().catch(() => router.replace("/booking/start"));
    return () => { alive = false; };
  }, [router]);

  // Heartbeat to refresh reservations every ~10 min
  useEffect(() => {
    const iv = setInterval(() => {
      travelers.forEach((t) => {
        const code = t.promo?.code;
        if (!code) return;
        fetch("/api/promo/apply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, travelerIdx: t.idx }),
        }).catch(() => {});
      });
    }, 10 * 60 * 1000);
    return () => clearInterval(iv);
  }, [travelers]);

  // Local editing model for names/dob/nationality
  const model = useMemo(() => travelers.map(t => ({
    idx: t.idx,
    isAdult: t.is_adult,
    minorAge: t.minor_age,
    firstName: (t.first_name ?? ""),
    lastName: (t.last_name ?? ""),
    dob: (t.dob ?? ""),
    nationalityCode: (t.nationality_code ?? "MX"),
    promo: t.promo || null,
  })), [travelers]);

  function setField(idx: number, key: "firstName"|"lastName"|"dob"|"nationalityCode", value: string) {
    setTravelers(prev => prev.map(t => {
      if (t.idx !== idx) return t;
      const patch: Partial<Traveler> = {};
      if (key === "firstName") patch.first_name = value.toUpperCase();
      if (key === "lastName")  patch.last_name  = value.toUpperCase();
      if (key === "dob")       patch.dob        = value;
      if (key === "nationalityCode") patch.nationality_code = value.toUpperCase();
      return { ...t, ...patch };
    }));
  }

  function validate(): Record<number, string> {
    const errs: Record<number, string> = {};
    for (const t of travelers) {
      const first = (t.first_name ?? "").trim();
      const last  = (t.last_name ?? "").trim();
      const nat   = (t.nationality_code ?? "").trim();
      const dob   = (t.dob ?? "").trim();

      if (!first || !last) { errs[t.idx] = "Please enter first and last names (as on passport)."; continue; }
      if (!/^[A-Z]{2}$/.test(nat)) { errs[t.idx] = "Choose a nationality."; continue; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) { errs[t.idx] = "Enter a valid date of birth (YYYY-MM-DD)."; continue; }

      if (t.is_adult) {
        const age = ageOn(SAIL_START, dob);
        if (age < 18) { errs[t.idx] = "Adults must be 18+ by Apr 5, 2026."; continue; }
      } else {
        const age = ageOn(SAIL_END, dob);
        if (age < 0 || age > 17) { errs[t.idx] = "Minors must be 0–17 by Apr 12, 2026."; continue; }
      }
    }
    return errs;
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    setErrors(v);

    // Promo gating per traveler: if "Apply a promo code" is checked…
    for (const t of travelers) {
      const idx = t.idx;
      if (wantsPromo[idx]) {
        const typed = (promoInputs[idx] || "").trim();
        // empty input → block submit
        if (!typed) {
          v[idx] = v[idx] || "Enter a promo code (or uncheck the box).";
        } else {
          const typedUpper = typed.toUpperCase();
          // typed but not validated to attach onto traveler → block submit
          if (!t.promo || t.promo.code !== typedUpper) {
            v[idx] = v[idx] || "Validate this code before continuing.";
          }
        }
      }
    }
    setErrors(v);

    if (Object.keys(v).length) {
      setSaved("fail");
      // Scroll to first offender & focus first input/select in that card
      const keys = Object.keys(v).map(Number).filter(n => !Number.isNaN(n));
      if (keys.length) {
        const firstIdx = Math.min(...keys);
        const el = cardRefs.current[firstIdx];
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          setTimeout(() => {
            const input = el.querySelector("input, select");
            if (input && input instanceof HTMLElement) input.focus();
          }, 250);
        }
      }
      return;
    }
    setSaving(true);
    try {
      const payload = {
        travelers: travelers.map(t => ({
          idx: t.idx,
          firstName: (t.first_name ?? "").trim().toUpperCase(),
          lastName:  (t.last_name  ?? "").trim().toUpperCase(),
          dob:       (t.dob ?? "").trim(),
          nationalityCode: (t.nationality_code ?? "MX").trim().toUpperCase(),
        }))
      };
      const res = await fetch("/api/booking/travelers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { setSaved("fail"); return; }
      setSaved("ok");
// Navigate to Cabins on successful save
try {
  const { startTransition } = await import("react");
  startTransition(() => router.push("/booking/cabins"));
  // Fallback in case transition is ignored
  setTimeout(() => {
    if (typeof window !== "undefined" && window.location.pathname.includes("/booking/travelers")) {
      window.location.assign("/booking/cabins");
    }
  }, 200);
} catch {}
    } finally {
      setSaving(false);
      setTimeout(() => setSaved(null), 3000);
    }
  }

  async function applyCode(idx: number) {
    const raw = (promoInputs[idx] || "").trim();
    if (!raw) { setPromoMsgs(m => ({ ...m, [idx]: "Enter a code to validate." })); return; }
    setPromoMsgs(m => ({ ...m, [idx]: "Validating…" }));
    const res = await fetch("/api/promo/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: raw, travelerIdx: idx }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const msg = data?.error === "CODE_ALREADY_USED" ? "This code was already used." :
                  data?.error === "CODE_DISABLED" ? "This code is disabled." :
                  data?.error === "CODE_EXPIRED" ? "This code is expired." :
                  data?.error === "CODE_NOT_FOUND" ? "Invalid code." :
                  "Couldn’t apply this code.";
      setPromoMsgs(m => ({ ...m, [idx]: msg }));
      return;
    }
    const data = await res.json();
    setTravelers(prev => prev.map(t => t.idx === idx ? { ...t, promo: { code: data.code, type: data.type } } : t));
    setPromoInputs(s => ({ ...s, [idx]: data.code }));
    setPromoMsgs(m => ({ ...m, [idx]: "Code applied." }));
    setTimeout(() => setPromoMsgs(m => ({ ...m, [idx]: "" })), 2500);
  }

  async function removeCode(idx: number) {
    await fetch("/api/promo/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ travelerIdx: idx }),
    });
    setTravelers(prev => prev.map(t => t.idx === idx ? { ...t, promo: null } : t));
    setPromoInputs(s => ({ ...s, [idx]: "" }));
    setPromoMsgs(m => ({ ...m, [idx]: "Code removed." }));
    setTimeout(() => setPromoMsgs(m => ({ ...m, [idx]: "" })), 1500);
  }

  function toggleWantsPromo(idx: number, checked: boolean) {
    setWantsPromo(w => ({ ...w, [idx]: checked }));
    // if they uncheck and there is a promo attached, release it immediately
    const t = travelers.find(x => x.idx === idx);
    if (!checked && t?.promo) removeCode(idx);
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Travelers</h1>
        <p className="text-neutral-700">Please enter traveler names, nationality, and date of birth.</p>
        <p className="text-neutral-600 text-sm">Adults must be 18+ by Apr 5, 2026; minors must be 0–17 by Apr 12, 2026.</p>
      </header>

      {saved === "ok" && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm">Saved.</div>
      )}
      {saved === "fail" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          Please fix the fields highlighted below and try again.
        </div>
      )}

      <div className="space-y-6">
        {travelers.map((t) => {
          const promoMsg = promoMsgs[t.idx] || "";
          const promoMsgClass = promoMsg.includes("Validating") ? "text-neutral-600" : "text-red-700";
          const checked = !!wantsPromo[t.idx];

          return (
            <div key={t.idx} ref={(node) => { cardRefs.current[t.idx] = node; }} className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div className="text-lg font-medium">
                  Traveler {t.idx + 1} {t.is_adult ? "(Adult)" : `(Minor${typeof t.minor_age === "number" ? `, age ${t.minor_age}` : ""})`}
                </div>

                {/* Promo chip (readable types) */}
                {t.promo && (
                  <div className="inline-flex items-center rounded-xl px-2.5 py-1 border text-xs bg-neutral-50">
                    {t.promo.type === "staff" && "Staff"}
                    {t.promo.type === "artist" && "Artist (50%)"}
                    {t.promo.type === "early_bird" && "Early Bird (15%)"}
                  </div>
                )}
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">First name(s)</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase"
                    value={(t.first_name ?? "")}
                    onChange={(e) => setField(t.idx, "firstName", e.target.value)}
                    placeholder="JUAN CARLOS"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Last name(s)</label>
                  <input
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase"
                    value={(t.last_name ?? "")}
                    onChange={(e) => setField(t.idx, "lastName", e.target.value)}
                    placeholder="PÉREZ GÓMEZ"
                  />
                </div>
              </div>

              {/* Nationality + DOB */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Nationality</label>
                  <select
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    value={(t.nationality_code ?? "MX")}
                    onChange={(e) => setField(t.idx, "nationalityCode", e.target.value)}
                  >
                    {countries.map((c) => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  <p className="text-xs text-neutral-500 mt-1">As shown on the traveler’s passport.</p>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Date of birth</label>
                  <input
                    type="date"
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    value={(t.dob ?? "")}
                    onChange={(e) => setField(t.idx, "dob", e.target.value)}
                  />
                  <p className="text-xs text-neutral-500 mt-1">
                    {t.is_adult ? "Must be 18+ by Apr 5, 2026." : "Must be 0–17 by Apr 12, 2026."}
                  </p>
                </div>
              </div>

              {/* Promo section with checkbox */}
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    checked={checked}
                    onChange={(e) => toggleWantsPromo(t.idx, e.target.checked)}
                  />
                  Apply a promo code for this traveler
                </label>

                {checked && (
                  <div className="flex items-center gap-2">
                    <input
                      className="w-48 rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase"
                      placeholder="e.g., ELAB-123B"
                      value={promoInputs[t.idx] ?? ""}
                      onChange={(e) => setPromoInputs(s => ({ ...s, [t.idx]: e.target.value.toUpperCase() }))}
                    />
                    {!t.promo ? (
                      <button type="button" onClick={() => applyCode(t.idx)} className="btn btn-primary">
                        Validate
                      </button>
                    ) : (
                      <button type="button" onClick={() => removeCode(t.idx)} className="btn btn-ghost">
                        Remove
                      </button>
                    )}
                  </div>
                )}

                {/* Result / hint */}
                {checked && promoMsgs[t.idx] && (
                  <p className={`text-xs mt-1 ${promoMsgs[t.idx].includes("Validating") ? "text-neutral-600" : "text-red-700"}`}>
                    {promoMsgs[t.idx]}
                  </p>
                )}
                {t.promo && (
                  <div className="rounded-xl border bg-neutral-50 p-3 text-sm">
                    {promoExplainer(t.promo.type)}
                  </div>
                )}
              </div>

              {errors[t.idx] && <p className="text-xs text-red-700 mt-1">{errors[t.idx]}</p>}
            </div>
          );
        })}
      </div>

      {/* Bottom banners (duplicate of top status) */}
      {saved === "ok" && (
        <div className="rounded-xl border bg-neutral-50 p-4 text-sm mt-2">Saved.</div>
      )}
      {saved === "fail" && (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 mt-2">
          Please fix the fields highlighted above and try again.
        </div>
      )}

      <div className="flex items-center justify-between">
        <a href="/booking/group-size" className="btn btn-ghost">Back</a>
        <button type="submit" disabled={saving} className="btn btn-primary disabled:opacity-60">
          Continue
        </button>
      </div>
    </form>
  );
}
