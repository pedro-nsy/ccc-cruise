"use client";

import { useEffect, useMemo, useState } from "react";

const DRAFT_KEY = "ccc-draft";

type Category = "INTERIOR" | "OCEAN" | "BALCONY";
type Layout = { doubles: number; triples: number; quads: number; cabins: number };

type Traveler = {
  fullName: string;
  isAdult: boolean;
  dob?: string;
  nationality?: string;
  minorAge?: number;
  promoCode?: string | null;
};

type Draft = {
  travelers?: Traveler[];
  cabins?: { category: Category; layout: Layout } | null;
  assignment?: {
    occupancies: (2|3|4)[];
    cabins: Array<{ occupants: number[] }>;
  } | null;
};

function readDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
function writeDraft(next: Draft) {
  if (typeof window !== "undefined") localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

function expandOccupancies(layout: Layout): (2|3|4)[] {
  const arr: (2|3|4)[] = [];
  for (let i = 0; i < layout.quads; i++) arr.push(4);
  for (let i = 0; i < layout.triples; i++) arr.push(3);
  for (let i = 0; i < layout.doubles; i++) arr.push(2);
  return arr;
}

function layoutLabel(c?: {doubles:number;triples:number;quads:number}) {
  if (!c) return "";
  const parts: string[] = [];
  if (c.quads) parts.push(`${c.quads}× quad`);
  if (c.triples) parts.push(`${c.triples}× triple`);
  if (c.doubles) parts.push(`${c.doubles}× double`);
  return parts.join(" · ");
}

export default function CabinAssignmentEditor({
  onValidChange,
}: {
  onValidChange?: (valid: boolean) => void;
}) {
  const [draft, setDraft] = useState<Draft>({});
  const travelers = draft.travelers ?? [];
  const chosen = draft.cabins ?? null;

  // initialize / normalize assignment to match current layout
  useEffect(() => {
    const d = readDraft();
    const occ = d.cabins ? expandOccupancies(d.cabins.layout) : [];
    const need = occ.length;

    // empty assignment matching current layout
    const empty = need
      ? {
          occupancies: occ,
          cabins: occ.map(o => ({ occupants: Array(o).fill(-1) })),
        }
      : null;

    // adopt existing if shape matches; otherwise reset
    const cur = d.assignment && d.assignment.occupancies?.join(",") === occ.join(",")
      ? d.assignment
      : empty;

    const next = { ...d, assignment: cur };
    writeDraft(next);
    setDraft(next);
  }, []);

  const assignment = draft.assignment;

  const usedTravelerIdx = useMemo(() => {
    const s = new Set<number>();
    assignment?.cabins.forEach(c => c.occupants.forEach(ix => { if (ix >= 0) s.add(ix); }));
    return s;
  }, [assignment]);

  const validation = useMemo(() => {
    if (!assignment || !chosen) return { ok: false, reason: "Choose your cabin category and layout first." };
    const totalSlots = assignment.occupancies.reduce((a, b) => a + b, 0);
    const assigned = assignment.cabins.flatMap(c => c.occupants).filter(ix => ix >= 0);

    // must assign exactly all travelers
    if (assigned.length !== travelers.length) {
      return { ok: false, reason: "Assign every traveler to a cabin." };
    }
    // no duplicates
    if (new Set(assigned).size !== assigned.length) {
      return { ok: false, reason: "A traveler was assigned to multiple paxs." };
    }
    // adult per cabin
    for (const c of assignment.cabins) {
      const hasAdult = c.occupants.some(ix => ix >= 0 && travelers[ix]?.isAdult);
      if (!hasAdult) return { ok: false, reason: "Each cabin must include at least one adult." };
    }
    // capacity guard
    if (travelers.length !== totalSlots) {
      return { ok: false, reason: "Choose a layout that matches your group size exactly (no extra or empty spots)." };
    }
    return { ok: true, reason: "" };
  }, [assignment, chosen, travelers]);

  useEffect(() => {
    onValidChange?.(validation.ok);
  }, [validation, onValidChange]);

  if (!chosen || !assignment) {
    return (
      <div className="rounded-2xl border p-4 text-sm text-neutral-600">
        Pick your cabin layout to assign travelers.
      </div>
    );
  }

  function setOccupant(cabinIdx: number, paxIdx: number, travelerIndex: number) {
    const next: Draft = JSON.parse(JSON.stringify(draft));

    // remove traveler from wherever they are
    if (travelerIndex >= 0) {
      next.assignment!.cabins.forEach(c => {
        c.occupants = c.occupants.map(ix => (ix === travelerIndex ? -1 : ix));
      });
    }

    // set selection in target traveler(s)
    next.assignment!.cabins[cabinIdx].occupants[paxIdx] = travelerIndex;

    writeDraft(next);
    setDraft(next);
  }

  function optionsForSlot(currentIx: number) {
    const opts = travelers
      .map((t, i) => ({ i, t }))
      .filter(x => !usedTravelerIdx.has(x.i) || x.i === currentIx);

    const current = currentIx >= 0 ? { i: currentIx, t: travelers[currentIx] } : null;
    const sorted = [
      ...(current ? [current] : []),
      ...opts.filter(o => o.i !== currentIx),
    ];
    return sorted;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border p-3 bg-white text-sm">
        <div className="font-medium">Selected: {layoutLabel(chosen.layout)} • {chosen.category}</div>
        <div className="text-xs text-neutral-600">Assign each traveler to a cabin below. Each cabin must include at least one adult. You can adjust these assignments later on the Review step. You can adjust these assignments later on the Review step.</div>
      </div>

      {assignment.cabins.map((cabin, cabinIdx) => (
        <div key={cabinIdx} className="rounded-2xl border p-4 bg-white space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Cabin {cabinIdx + 1} • {assignment.occupancies[cabinIdx]} travelers</div>
            {!cabin.occupants.some(ix => ix >= 0 && travelers[ix]?.isAdult) && (
              <div className="text-xs text-red-600">Needs at least one adult</div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {cabin.occupants.map((ix, paxIdx) => {
              const opts = optionsForSlot(ix);
              return (
                <label key={paxIdx} className="text-sm">
                  <span className="block text-neutral-600 mb-1">Select traveler</span>
                  <select
                    className="w-full rounded-xl border px-3 py-2"
                    value={ix}
                    onChange={(e) => setOccupant(cabinIdx, paxIdx, Number(e.target.value))}
                  >
                    <option value={-1}>— Select traveler —</option>
                    {opts.map(({ i, t }) => (
                      <option key={i} value={i}>
                        {t.fullName || "(Name pending)"} {t.isAdult ? "" : `(Minor${typeof t.minorAge === "number" ? ` • ${t.minorAge}` : ""})`}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {!validation.ok && (
        <div className="text-xs text-red-600">{validation.reason}</div>
      )}
    </div>
  );
}







