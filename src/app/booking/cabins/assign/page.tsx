"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CabinAssignmentEditor from "@/components/booking/CabinAssignmentEditor";
import { isAssignmentValid } from "@/lib/assignment";

export default function Page() {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [travelers, setTravelers] = useState<any[]>([]);
  const [cabins, setCabins] = useState<any | null>(null);
  const [assignment, setAssignment] = useState<any | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
    setTravelers(draft.travelers || []);
    setCabins(draft.cabins || null);
    setAssignment(draft.assignment || null);
    setLoaded(true);
  }, []);

  function back() { router.push("/booking/cabins"); }

  function next(e: React.FormEvent) {
    e.preventDefault();
    const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
    if (!isAssignmentValid(assignment, travelers)) {
      alert("Please assign all travelers to cabins (with at least one adult per cabin).");
      return;
    }
    localStorage.setItem("ccc-draft", JSON.stringify({ ...draft, assignment }));
    router.push("/booking/review");
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading cabin assignment…
      </div>
    );
  }

  if (!cabins) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-600">
        First choose your cabin category and layout before assigning travelers.
      </div>
    );
  }

  return (
    <form onSubmit={next} className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Assign travelers to cabins</h1>
        <p className="text-neutral-700">
          Place each traveler into a cabin. Every cabin must include at least one adult.
        </p>
        <p className="text-sm text-neutral-600">
          You can adjust assignments later on the Review step.
        </p>
        <p className="text-sm text-neutral-600">
          We’ll only show the cabins that match the layout you selected.
        </p>
      </header>

      {/* Assignment editor */}
      <section className="rounded-2xl border bg-white p-6">
        <CabinAssignmentEditor
          travelers={travelers}
          cabins={cabins}
          value={assignment}
          onChange={setAssignment}
        />
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-ghost">
          Back
        </button>
        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}

