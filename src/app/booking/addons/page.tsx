"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Addons = {
  flights: boolean;
  hotels: boolean;
  ground: boolean;
  drinks: boolean;
  none: boolean;
};
type Draft = { addons?: Addons | null };

const DRAFT_KEY = "ccc-draft";

function readDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
function writeDraft(next: any) {
  if (typeof window !== "undefined") localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}

export default function Page() {
  const [holdExpired, setHoldExpired] = useState(false);
  const [deadline, setDeadline] = useState<string>("");
  useEffect(() => {
    setHoldExpired(isHoldExpired());
    setDeadline(holdDeadlineLabel());
  }, []);

  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [addons, setAddons] = useState<Addons>({ flights:false, hotels:false, ground:false, drinks:false, none:false });

  useEffect(() => {
    const d = readDraft();
    if (d.addons) setAddons(d.addons);
    setReady(true);
  }, []);

  function toggle(key: keyof Addons) {
    setAddons(prev => {
      // None is exclusive
      if (key === "none") return { flights:false, hotels:false, ground:false, drinks:false, none: !prev.none };
      if (prev.none) return { ...prev, none:false, [key]: !prev[key] };
      return { ...prev, [key]: !prev[key] };
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const valid = addons.none || addons.flights || addons.hotels || addons.ground || addons.drinks;
    if (!valid) return;
    const d = readDraft();
    writeDraft({ ...d, addons });
    router.push("/booking/pay");
  }

  if (!ready) {
    return <div className="mx-auto max-w-xl rounded-2xl border p-6 bg-white text-center text-neutral-500">Loading…</div>;
  }

  const valid = addons.none || addons.flights || addons.hotels || addons.ground || addons.drinks;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl space-y-6">
      <header className="text-center space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold">Add-ons (optional)</h1>
        <p className="text-neutral-700 text-sm">
          Would you like CCC to contact you later about these optional add-ons? Choose any that apply, or select “None of the above”.
        </p>
      </header>
{holdExpired ? (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
    Your 48h business-day hold has expired. Availability and pricing will be re-evaluated on Pay.
  </div>
) : (
  <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
    Hold active — reserved until <strong>{deadline}</strong> (business days). You can still adjust add-ons.
  </div>
)}

      <div className="rounded-2xl border p-6 bg-white space-y-3">
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={addons.flights} onChange={()=>toggle("flights")} /> Flights ✈️
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={addons.hotels} onChange={()=>toggle("hotels")} /> Hotels 🏨
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={addons.ground} onChange={()=>toggle("ground")} /> Ground transportation 🚐
        </label>
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={addons.drinks} onChange={()=>toggle("drinks")} /> Drink packages 🍹
        </label>

        <div className="pt-2">
          <label className="flex items-center gap-3 text-sm">
            <input type="checkbox" checked={addons.none} onChange={()=>toggle("none")} /> None of the above ❌
          </label>
          {!valid && <div className="text-xs text-red-600 mt-2">Please choose at least one option or select “None of the above”.</div>}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button type="button" onClick={()=>history.back()} className="btn btn-ghost">Back</button>
        <button type="submit" disabled={!valid} className="btn btn-primary disabled:opacity-60">Continue</button>
      </div>
    </form>
  );
}



import { isHoldExpired, holdDeadlineLabel } from "../../../lib/hold/client";
