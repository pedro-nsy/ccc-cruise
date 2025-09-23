'use client';
import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

/** ---------- Types ---------- */
type Category = "INTERIOR" | "OCEAN" | "BALCONY";
type Layout = { doubles: number; triples: number; quads: number; cabins: number };

type Traveler = {
  fullName: string;
  dob?: string;
  nationality?: string;
  isAdult: boolean;
  minorAge?: number;
  promoCode?: string | null; // any non-empty => Artist/Staff style discount (50% public)
};

type Draft = {
  lead?: { fullName?: string; email?: string; phone?: string };
  travelers?: Traveler[];
  groupSize?: { adults: number; minors: number; minorAges: number[] };
  cabins?: { category: Category; layout: Layout } | null;
  assignment?: { occupancies: (2|3|4)[]; cabins: Array<{ occupants: number[] }> } | null;
  intent?: { hasPromo?: boolean; promoFlags?: { false?: boolean } };
  paymentIntent?: {
    payMode?: "DEPOSIT" | "FULL";
    amountDueToday?: number;
    estimateTotal?: number;
    nonRefundableBase?: number;
    depositBaseline?: number;
  };
};

const DRAFT_KEY = "ccc-draft";

/** ---------- Labels & Pricing Tables ---------- */
const CAT_LABEL: Record<Category, string> = {
  INTERIOR: "Interior",
  OCEAN: "Ocean View",
  BALCONY: "Balcony",
};

// Official Public (per person) by occupancy
const PUBLIC_PP: Record<Category, Record<2|3|4, number>> = {
  INTERIOR: { 2: 28800, 3: 27400, 4: 26800 },
  OCEAN:    { 2: 34000, 3: 31600, 4: 30400 },
  BALCONY:  { 2: 38200, 3: 35400, 4: 34000 },
};

// Artist / Staff (50% of public) by occupancy
const ARTIST_PP: Record<Category, Record<2|3|4, number>> = {
  INTERIOR: { 2: 14400, 3: 13700, 4: 13400 },
  OCEAN:    { 2: 17000, 3: 15800, 4: 15200 },
  BALCONY:  { 2: 19100, 3: 17700, 4: 17000 },
};

// Early Bird by occupancy
const EB_PP: Record<Category, Record<2|3|4, number>> = {
  INTERIOR: { 2: 24480, 3: 23290, 4: 22780 },
  OCEAN:    { 2: 28900, 3: 26860, 4: 25840 },
  BALCONY:  { 2: 32470, 3: 30090, 4: 28900 },
};

//  upgrade deltas vs Interior public (double) per person
const _UPGRADE_DELTA: Record<Category, number> = {
  INTERIOR: 0,
  OCEAN: 5200,
  BALCONY: 9400,
};

// Key dates
const DATE_OCT15 = "Oct 15, 2025";
const DATE_DEC15 = "Dec 15, 2025";

/** Safe EB gating based on draft + hold flag. Pure function; no hooks. */
function getEbActive(draft: any) {
  try {
    const createdAtMs = draft?.booking?.createdAt
      ? new Date(draft.booking.createdAt).getTime()
      : Date.now();
    // Guard against SSR / module-eval time
    const expiredHold = typeof window !== "undefined" && Boolean((window as any).__cccExpiredHold);
    return !expiredHold && createdAtMs <= parseDateLabel(DATE_OCT15);
  } catch {
    return false;
  }
}

/** EB active if today is on/before Oct 15, 2025 */
/** ---------- Helpers ---------- */
function readDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
function writeDraft(next: Draft) {
  if (typeof window !== "undefined") localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

function layoutLabel(c?: {doubles:number;triples:number;quads:number}) {
  if (!c) return "";
  const parts: string[] = [];
  if (c.quads) parts.push(`${c.quads}× quad`);
  if (c.triples) parts.push(`${c.triples}× triple`);
  if (c.doubles) parts.push(`${c.doubles}× double`);
  return parts.join(" · ");
}

function expandOccupancies(layout: Layout): (2|3|4)[] {
  const arr: (2|3|4)[] = [];
  for (let i = 0; i < layout.quads; i++) arr.push(4);
  for (let i = 0; i < layout.triples; i++) arr.push(3);
  for (let i = 0; i < layout.doubles; i++) arr.push(2);
  return arr;
}

function fmt(amount: number) {
  return `MXN ${Math.round(amount).toLocaleString()}`;
}

type PricingKind = "" | "ARTIST" | "EARLY_BIRD";

function travelerPrice(kind: PricingKind, cat: Category, occ: 2|3|4): number {
  if (kind === "") return _UPGRADE_DELTA[cat];
  if (kind === "ARTIST") return ARTIST_PP[cat][occ];
  return EB_PP[cat][occ];
}
function publicDouble(cat: Category) { return PUBLIC_PP[cat][2]; }

type TravelerSchedule = {
  dueNow: number;
  nonRefundableNow: boolean;
  later: Array<{ date: string; label: string; amount: number }>;
};

function scheduleFor(kind: PricingKind, total: number): TravelerSchedule {
  if (kind === "") {
    const dueNow = Math.round(total * 0.5);
    return {
      dueNow,
      nonRefundableNow: false,
      later: [{ date: DATE_DEC15, label: "Final balance", amount: Math.max(total - dueNow, 0) }],
    };
  }
  if (kind === "ARTIST") {
    const dueNow = Math.round(total * 0.5);
    return {
      dueNow,
      nonRefundableNow: true,
      later: [{ date: DATE_DEC15, label: "Final balance", amount: Math.max(total - dueNow, 0) }],
    };
  }
  if (kind === "PUBLIC") {
  const dep = 3000;
  const due30 = new Date(); due30.setDate(due30.getDate()+30);
  const addl = Math.max(0, Math.min(13000, total - dep));
  const later: Array<{date:string;label:string;amount:number}> = [];
  if (addl > 0) later.push({ date: new Intl.DateTimeFormat("en-US",{month:"short",day:"numeric",year:"numeric"}).format(due30), label: "Scheduled", amount: addl });
  later.push({ date: "Jan 10, 2026", label: "Final balance", amount: Math.max(total - dep - addl, 0) });
  return { dueNow: Math.min(dep, total), nonRefundableNow: true, later };
}
// EARLY_BIRD
  const deposit = 3000;
  const half = Math.round(total * 0.5);
  const byOct = Math.max(half - deposit, 0);
  const byDec = Math.max(total - deposit - byOct, 0);
  return {
    dueNow: deposit,
    nonRefundableNow: true,
    later: [
      ...(byOct > 0 ? [{ date: DATE_OCT15, label: "Up to 50% due", amount: byOct }] : []),
      ...(byDec > 0 ? [{ date: DATE_DEC15, label: "Final balance", amount: byDec }] : []),
    ],
  };
}

function parseDateLabel(s: string): number {
  const m = s.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (!m) return 0;
  const mon = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].indexOf(m[1]);
  return new Date(Number(m[3]), mon, Number(m[2])).getTime();
}



/** CDMX tz offset handling is simplified to local browser time for now. */
function addBusinessHours48(from: Date): Date {
  // 48 "business hours" = 2 full business days (Mon–Fri). Simplified rule:
  // If start falls on Fri, deadline jumps to Tue; Sat/Sun push to Tue as well.
  // Otherwise add 2 days, skipping weekend.
  const d = new Date(from.getTime());
  const day = d.getDay(); // 0=Sun..6=Sat
  // Normalize start to weekday baseline
  let addDays = 2;
  if (day === 5) addDays = 4;      // Fri -> +4 days => Tue
  else if (day === 6) addDays = 3; // Sat -> +3 days => Tue
  else if (day === 0) addDays = 2; // Sun -> +2 days => Tue
  d.setDate(d.getDate() + addDays);
  return d;
}
/** ---------- Review Page ---------- */
/** Returns a tuple: [kindsAfterCap, overflowInfo] */
function applyPerPersonCaps(params: {
  kinds: (""|"ARTIST"|"EARLY_BIRD"|"PUBLIC")[];
  category: "INTERIOR"|"OCEAN"|"BALCONY";
}) {
  const { kinds, category } = params;
  const result = [...kinds];

  // 1) Check Artist headcount (per-person, code-based)
  const artistRemaining = getArtistRemaining(category);
  let artistRequested = kinds.filter(k => k === "ARTIST").length;
  let artistGranted = Math.min(artistRequested, artistRemaining);
  let artistOverflow = Math.max(artistRequested - artistGranted, 0);

  if (artistOverflow > 0) {
    // Reprice overflow ARTIST travelers to PUBLIC (deterministic: late indices)
    for (let i = result.length - 1; i >= 0 && artistOverflow > 0; i--) {
      if (result[i] === "ARTIST") { result[i] = "PUBLIC"; artistOverflow--; }
    }
  }

  // 2) Check Early Bird headcount (per-person, date-based)
  const ebRemaining = getEbRemaining(category);
  let ebRequested = kinds.filter(k => k === "EARLY_BIRD").length;
  let ebGranted = Math.min(ebRequested, ebRemaining);
  let ebOverflow = Math.max(ebRequested - ebGranted, 0);

  if (ebOverflow > 0) {
    // Reprice overflow EB travelers to PUBLIC (deterministic: late indices)
    for (let i = result.length - 1; i >= 0 && ebOverflow > 0; i--) {
      if (result[i] === "EARLY_BIRD") { result[i] = "PUBLIC"; ebOverflow--; }
    }
  }

  return [result, {
    eb: { requested: ebRequested, granted: ebGranted },
    artist: { requested: artistRequested, granted: artistGranted }
  }] as const;
}


export default function Page() {
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
const ebActive = true;
  const [payMode, setPayMode] = useState<"DEPOSIT" | "FULL">("DEPOSIT");

  useEffect(() => {
  const d = readDraft();
  setDraft(d);
  setPayMode(d?.paymentIntent?.payMode ?? "DEPOSIT");

  // Expiry detection (only meaningful if there is a claimExpiresAt and no card-paid flag yet)
  const exp = d?.booking?.claimExpiresAt ? new Date(d.booking.claimExpiresAt).getTime() : 0;
  const now = Date.now();
  (window as any).__cccExpiredHold = Boolean(exp && now > exp && !d?.paymentIntent?.cardPaidAt);

  setLoaded(true);
}, []);const travelers = draft.travelers ?? [];
  const cabins = draft.cabins ?? null;
const has = false;
  const occs = cabins?.layout ? expandOccupancies(cabins.layout) : [];
  const usingFallback = !draft.assignment || draft.assignment.occupancies?.join(",") !== occs.join(",");

  // Map traveler index -> occupancy for their assigned cabin
  const assigned = useMemo(() => {
    if (!draft.assignment || !cabins) return null;
    const occArr = draft.assignment.occupancies;
    const map = new Map<number, 2|3|4>();
    draft.assignment.cabins.forEach((c, ci) => {
      const occ = occArr[ci];
      c.occupants.forEach((ix) => { if (typeof ix === "number" && ix >= 0) map.set(ix, occ); });
    });
    return map;
  }, [draft.assignment, cabins]);

  type PerTravelerRow = {
    idx: number;
    traveler: Traveler;
    occ: 2|3|4;
    kind: PricingKind;
    publicDouble: number;
    price: number;
    schedule: TravelerSchedule;
  };

  const rows: PerTravelerRow[] = useMemo(() => {
    if (!cabins) return [];
    const cat = cabins.category;
    const out: PerTravelerRow[] = [];
    travelers.forEach((t, i) => {
      const occ = (assigned?.get(i) ?? occs[0] ?? 2) as 2|3|4;
      const kind: PricingKind = has ?  "" : (t.promoCode && t.promoCode.trim()) ? "ARTIST" : (true ? "EARLY_BIRD" : "PUBLIC");
      const price = travelerPrice(kind, cat, occ);
      const sch = scheduleFor(kind, price);
      out.push({ idx: i, traveler: t, occ, kind, publicDouble: publicDouble(cat), price, schedule: sch });
    });
    return out;
  }, [travelers, assigned, occs, cabins, has]);

  // Totals
  const publicDoubleTotal = cabins ? publicDouble(cabins.category) * rows.length : 0;
  const grandTotal  = rows.reduce((s, r) => s + r.price, 0);
  const savings     = Math.max(publicDoubleTotal - grandTotal, 0);
  const depositTotal = rows.reduce((s, r) => s + r.schedule.dueNow, 0);

  const nonRefundableAll = rows.every(r => r.schedule.nonRefundableNow);
  const nonRefundableSome = !nonRefundableAll && rows.some(r => r.schedule.nonRefundableNow);

  const laterByDate = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => r.schedule.later.forEach(({ date, amount }) => map.set(date, (map.get(date) ?? 0) + amount)));
    return Array.from(map.entries())
      .map(([date, amount]) => ({ date, amount, ts: parseDateLabel(date) }))
      .sort((a, b) => a.ts - b.ts)
      .map(({ date, amount }) => ({ date, amount }));
  }, [rows]);

  const amountDueToday = payMode === "FULL" ? grandTotal : depositTotal;

  function back() { router.push("/booking/cabins/assign"); }
  function next(e: React.FormEvent) {
    e.preventDefault();
    const cur = readDraft();
    // Persist baseline so /pay can show the tiny non-refundable line
    const rolesSnapshot = rows.map(r => r.kind);
const createdAt = draft?.booking?.createdAt ?? new Date().toISOString();
const claimExpiresAt = draft?.booking?.claimExpiresAt ?? addBusinessHours48(new Date(createdAt)).toISOString();

// Headcount claims (local-only; server will enforce later)
const cat = cabins?.category || "INTERIOR";
const ebCount  = rows.filter(r => r.kind === "EARLY_BIRD").length;
const artCount = rows.filter(r => r.kind === "ARTIST").length;
const prevEb   = (draft?.capClaims?.eb ?? {})[cat] ?? 0;
const prevArt  = (draft?.capClaims?.artist ?? {})[cat] ?? 0;
const capClaims = {
  eb:     { ...(draft?.capClaims?.eb ?? {}),     [cat]: prevEb  + ebCount  },
  artist: { ...(draft?.capClaims?.artist ?? {}), [cat]: prevArt + artCount },
};

const paymentIntent = {
  payMode,
  amountDueToday: payMode === "FULL" ? grandTotal : depositTotal,
  estimateTotal: grandTotal,
  nonRefundableBase: depositTotal,
  depositBaseline: depositTotal,
};

// Persist snapshot
writeDraft({
  ...draft,
  booking: { ...(draft?.booking ?? {}), createdAt, claimExpiresAt },
  capClaims,
  rolesSnapshot,
  paymentIntent
});
writeDraft({ ...cur, paymentIntent });
    router.push("/booking/addons");
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading review…
      </div>
    );
  }

  const people = travelers.length;

  return (
    <form onSubmit={next} className="mx-auto max-w-5xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Review & payment</h1>
        <p className="text-neutral-700 text-sm">
          Confirm traveler details, see per-person prices and payment dates, and choose to pay the deposit or the full balance today.
        </p>
      </header>

{Boolean((window as any).__cccExpiredHold) && (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 mt-4">
    Your previous price hold has expired. We re-evaluated your booking and updated prices where needed.
  </div>
)}


      {/* Booking summary */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm font-medium">Booking summary</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-neutral-500">Lead passenger</div>
            <div className="font-medium">{draft.lead?.fullName || "—"}</div>
            <div className="text-neutral-600">{draft.lead?.email || ""}</div>
          </div>
          <div>
            <div className="text-neutral-500">Travelers</div>
            <div className="font-medium">{people} total</div>
            <div className="text-neutral-600">
              {(draft.groupSize?.adults ?? 0)} adult(s) · {(draft.groupSize?.minors ?? 0)} minor(s)
            </div>
          </div>
          <div>
            <div className="text-neutral-500">Category</div>
            <div className="font-medium">{cabins ? CAT_LABEL[cabins.category] : "—"}</div>
          </div>
          <div>
            <div className="text-neutral-500">Layout</div>
            <div className="font-medium">{cabins ? layoutLabel(cabins.layout) : "—"}</div>
          </div>
        </div>

        {usingFallback && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
            We auto-grouped your travelers based on your layout. For full control, go back to assign each traveler to a specific cabin.
          </div>
        )}
      </section>

      {/* Per-traveler breakdown */}
      <section className="rounded-2xl border bg-white p-6">
        <div className="text-sm font-medium mb-3">Traveler pricing details</div>
        <div className="space-y-4">
          {rows.map((r) => {
            const t = r.traveler;
            const roleLabel =
              r.kind === "" ? " Upgrade" :
              r.kind === "ARTIST" ? "Artist / Staff" : "Early Bird";
            const showPublicLine = r.price < r.publicDouble;

            return (
              <div key={r.idx} className="rounded-xl border p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  {/* Left: Traveler info */}
                  <div className="text-sm space-y-0.5">
                    <div className="font-medium">{t.fullName || "(Name pending)"}</div>
                    <div className="text-neutral-600">
                      {t.isAdult ? "Adult" : `Minor${typeof t.minorAge === "number" ? ` • ${t.minorAge} yr` : ""}`}
                    </div>
                    <div className="text-neutral-600">{t.nationality || "Nationality – pending"}</div>
                    <div className="text-xs text-neutral-500">Assigned in a {r.occ}-traveler cabin</div>
                  </div>

                  {/* Right: Price & schedule */}
                  <div className="text-sm w-full md:w-80">
                    {showPublicLine && (
                      <div className="flex items-center justify-between">
                        <div className="text-neutral-600">Public price (double occupancy)</div>
                        <div className="line-through text-neutral-400">{fmt(r.publicDouble)}</div>
                      </div>
                    )}
                    <div className="mt-1 flex items-center justify-between">
                      <div className="font-medium">Your price</div>
                      <div className="font-semibold">{fmt(r.price)}</div>
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-600">{roleLabel}</div>

                    <div className="mt-3 rounded-lg border bg-neutral-50 p-3">
                      {payMode === "FULL" ? (
                        <div className="flex items-center justify-between">
                          <div>Due today (paying in full)</div>
                          <div className="font-semibold">{fmt(r.price)}</div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <div>Due today{r.schedule.nonRefundableNow ? " (non-refundable)" : ""}</div>
                            <div className="font-semibold">{fmt(r.schedule.dueNow)}</div>
                          </div>
                          {r.schedule.later.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {r.schedule.later
                                .slice()
                                .sort((a, b) => parseDateLabel(a.date) - parseDateLabel(b.date))
                                .map((L, i) => (
                                  <li key={i} className="flex items-center justify-between text-neutral-700">
                                    <span>{L.label} — <span className="text-neutral-600">{L.date}</span></span>
                                    <span className="font-medium">{fmt(L.amount)}</span>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Payment summary */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm font-medium">Payment summary</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Totals & savings */}
          <div className="rounded-xl border p-4 space-y-2">
            {savings > 0 && (
              <div className="flex items-center justify-between">
                <div className="text-sm text-neutral-600">Public total (double occupancy)</div>
                <div className="text-lg font-medium line-through text-neutral-400">{fmt(publicDoubleTotal)}</div>
              </div>
            )}
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600">Your Total</div>
              <div className="text-2xl font-semibold">{fmt(grandTotal)}</div>
            </div>
            {savings > 0 && (
              <div className="inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-xs text-green-700">
                You save {fmt(savings)}
              </div>
            )}
          </div>

          {/* Required today & timeline */}
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-neutral-600">
                Required today{(!has && (nonRefundableAll || nonRefundableSome) && payMode!=="FULL") ? " (non-refundable)" : ""}
              </div>
              <div className="text-2xl font-semibold">
                {fmt(payMode === "FULL" ? grandTotal : depositTotal)}
              </div>
            </div>

            {/* Tiny non-refundable note for Pay in full */}
            {payMode === "FULL" && (
              <div className="text-xs text-neutral-500 -mt-1">
                Non-refundable portion (deposit): <span className="font-medium text-neutral-600">{fmt(depositTotal)}</span>
              </div>
            )}

            {payMode === "DEPOSIT" && laterByDate.length > 0 && (
              <div className="mt-1">
                <div className="text-sm font-medium mb-1">Upcoming totals</div>
                <ul className="space-y-1 text-sm">
                  {laterByDate.map((d, i) => (
                    <li key={i} className="flex items-center justify-between">
                      <span>{d.date}</span>
                      <span className="font-semibold">{fmt(d.amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Pay choice */}
        <div className="rounded-xl border p-4">
          <div className="text-sm font-medium mb-2">How much would you like to pay today?</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setPayMode("DEPOSIT")}
              className={`rounded-xl border px-3 py-2 ${payMode==="DEPOSIT" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
            >
              Pay deposit
            </button>
            <button
              type="button"
              onClick={() => setPayMode("FULL")}
              className={`rounded-xl border px-3 py-2 ${payMode==="FULL" ? "bg-blue-600 text-white border-blue-600" : "bg-white"}`}
            >
              Pay in full
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-600">
            On the next page you’ll choose your payment method.
          </p>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-ghost">Back</button>
        <button type="submit" className="btn btn-primary">Continue</button>
      </div>
    </form>
  );
}



















