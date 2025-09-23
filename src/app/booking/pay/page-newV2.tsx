"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type PayMode = "DEPOSIT" | "FULL";
type Method =
  | "CARD_MXN"
  | "TRANSFER_MXN"
  | "CASH_MXN"
  | "CASH_USD"
  | "OTHER";

type PaymentIntent = {
  payMode?: PayMode;
  amountDueToday?: number;
  estimateTotal?: number;
  nonRefundableBase?: number;   // baseline deposit total (for tiny note on FULL)
  depositBaseline?: number;     // same baseline we persist from /review
  method?: Method;
  cfdi?: {
    rfc?: string;
    regimen?: string;
    uso?: string;
    csfFileName?: string;
  } | null;
};

type Draft = {
  lead?: { fullName?: string; email?: string; phone?: string } | null;
  paymentIntent?: PaymentIntent | null;
};

const DRAFT_KEY = "ccc-draft";

/** ---------- Helpers ---------- */
function readDraft(): Draft {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || "{}"); } catch { return {}; }
}
function writeDraft(next: Draft) {
  if (typeof window !== "undefined") localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
}
function fmt(amount: number) { return `MXN ${Math.round(amount).toLocaleString()}`; }

function rfcKind(rfc: string) {
  const t = (rfc || "").trim().toUpperCase();
  if (t.length === 12) return "PM"; // Persona Moral
  if (t.length === 13) return "PF"; // Persona Física
  return null;
}

/** ---------- Page ---------- */
export default function Page() {
  const router = useRouter();

  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Draft>({});
  const [method, setMethod] = useState<Method>("CARD_MXN");

  // CFDI fields – only applicable for CARD_MXN & TRANSFER_MXN
  const [rfc, setRfc] = useState("");
  const [regimen, setRegimen] = useState("");
  const [uso, setUso] = useState("");
  const [csfName, setCsfName] = useState("");

  const payMode: PayMode = (draft?.paymentIntent?.payMode ?? "DEPOSIT") as PayMode;
  const amountDueToday = draft?.paymentIntent?.amountDueToday ?? 0;
  const estimateTotal  = draft?.paymentIntent?.estimateTotal ?? 0;
  const baseline       = draft?.paymentIntent?.nonRefundableBase ?? draft?.paymentIntent?.depositBaseline ?? 0;

  const cfdiAllowed = method === "CARD_MXN" || method === "TRANSFER_MXN";

  useEffect(() => {
    const d = readDraft();
    setDraft(d);
    const initialMethod = (d?.paymentIntent?.method ?? "CARD_MXN") as Method;
    setMethod(initialMethod);

    // Load any prior CFDI details if present
    const cfdi = d?.paymentIntent?.cfdi;
    if (cfdi) {
      setRfc(cfdi.rfc ?? "");
      setRegimen(cfdi.regimen ?? "");
      setUso(cfdi.uso ?? "");
      setCsfName(cfdi.csfFileName ?? "");
    }
    setLoaded(true);
  }, []);

  const rfcType = useMemo(() => rfcKind(rfc), [rfc]);
  const rfcError = useMemo(() => {
    if (!cfdiAllowed) return "";
    const t = (rfc || "").trim().toUpperCase();
    if (!t) return "";
    if (t.length !== 12 && t.length !== 13) return "RFC must be 12 (PM) or 13 (PF) characters.";
    return "";
  }, [rfc, cfdiAllowed]);

  function back() {
    // Back just goes back in our flow (previous step = /booking/review)
    router.push("/booking/review");
  }

  function onChooseFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setCsfName(file.name);
  }

  function saveAndContinue(e: React.FormEvent) {
    e.preventDefault();

    const current = readDraft();

    const cfdiPayload = cfdiAllowed
      ? {
          rfc: (rfc || "").toUpperCase().trim(),
          regimen: regimen || "",
          uso: uso || "",
          csfFileName: csfName || "",
        }
      : null;

    const next: Draft = {
      ...current,
      paymentIntent: {
        ...(current.paymentIntent ?? {}),
        method,
        // keep all baselines from Review
        amountDueToday,
        estimateTotal,
        nonRefundableBase: baseline,
        depositBaseline: baseline,
        cfdi: cfdiPayload,
      },
    };

    writeDraft(next);

    // Route by method:
    if (method === "CARD_MXN") {
      // Placeholder: you’ll wire to Stripe Checkout; we persist a pending intent_id later
      router.push("/booking/confirm"); // you can swap to a /checkout route when Stripe is ready
    } else if (method === "TRANSFER_MXN") {
      router.push("/booking/confirm"); // shows bank instructions & pending status
    } else if (method === "CASH_MXN" || method === "CASH_USD" || method === "OTHER") {
      router.push("/booking/confirm"); // office/contact flows, mark as pending
    }
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading payment…
      </div>
    );
  }

  return (
    <form onSubmit={saveAndContinue} className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Choose your payment method</h1>
        <p className="text-neutral-700 text-sm">
          Secure your booking and finish the payment setup. We’ll save your choice and show the right instructions next.
        </p>
      </header>

      {/* Amount card */}
      <section className="rounded-2xl border bg-white p-6 space-y-2">
        <div className="text-sm font-medium">{payMode === "DEPOSIT" ? "Deposit (non-refundable)" : "Amount due now"}</div>
        <div className="text-3xl font-semibold">{fmt(amountDueToday)}</div>
        {payMode === "FULL" && (
          <div className="mt-2 rounded-xl border bg-neutral-50 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span>Non-refundable portion (deposit)</span>
              <span className="font-medium">{fmt(baseline)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-neutral-600">
              <span>Potentially refundable later</span>
              <span className="font-medium">{fmt(Math.max(estimateTotal - baseline, 0))}</span>
            </div>
          </div>
        )}
      </section>

      {/* Methods */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm font-medium">Payment methods</div>

        {/* CARD */}
        <label className="block rounded-2xl border p-5 hover:border-neutral-300">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={method === "CARD_MXN"}
              onChange={() => setMethod("CARD_MXN")}
            />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Credit / Debit Card — MXN</div>
              <div className="text-neutral-600">
                Pay by card in MXN. Confirmation is immediate. CFDI available.
              </div>
              <div className="text-xs text-neutral-500">
                Note: A processing fee may apply (placeholder % until final is confirmed).
              </div>
            </div>
          </div>
        </label>

        {/* TRANSFER MXN */}
        <label className="block rounded-2xl border p-5 hover:border-neutral-300">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={method === "TRANSFER_MXN"}
              onChange={() => setMethod("TRANSFER_MXN")}
            />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Bank Transfer — Mexico (MXN)</div>
              <div className="text-neutral-600">
                We’ll hold your price for <span className="font-medium">48 business hours</span> while you send a Mexican bank transfer. CFDI available.
              </div>
            </div>
          </div>
        </label>

        {/* CASH MXN */}
        <label className="block rounded-2xl border p-5 hover:border-neutral-300">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={method === "CASH_MXN"}
              onChange={() => setMethod("CASH_MXN")}
            />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Cash at InterTravel office — MXN</div>
              <div className="text-neutral-600">
                Pay in person in MXN at our office. We’ll hold your price for <span className="font-medium">48 business hours</span>. CFDI not available.
              </div>
            </div>
          </div>
        </label>

        {/* CASH USD */}
        <label className="block rounded-2xl border p-5 hover:border-neutral-300">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={method === "CASH_USD"}
              onChange={() => setMethod("CASH_USD")}
            />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Cash at InterTravel office — USD</div>
              <div className="text-neutral-600">
                Pay in person in USD at our office. Amount is calculated at the day’s rate at the office. We’ll hold your price for <span className="font-medium">48 business hours</span>. CFDI not available.
              </div>
            </div>
          </div>
        </label>

        {/* OTHER */}
        <label className="block rounded-2xl border p-5 hover:border-neutral-300">
          <div className="flex items-start gap-3">
            <input
              type="radio"
              name="method"
              className="mt-1"
              checked={method === "OTHER"}
              onChange={() => setMethod("OTHER")}
            />
            <div className="space-y-1 text-sm">
              <div className="font-medium">Other</div>
              <div className="text-neutral-600">
                If none of these work, choose this option and we’ll contact you with alternatives.
              </div>
            </div>
          </div>
        </label>
      </section>

      {/* CFDI SECTION (only for CARD & TRANSFER) */}
      {cfdiAllowed && (
        <section className="rounded-2xl border bg-white p-6 space-y-4">
          <div className="text-sm font-medium">CFDI (Factura Electrónica)</div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">RFC</label>
            <input
              value={rfc}
              onChange={(e) => setRfc(e.target.value.toUpperCase())}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
              placeholder="12 or 13 characters"
            />
            {!!rfcError && <p className="text-xs text-red-700 mt-1">{rfcError}</p>}
            <p className="text-xs text-neutral-500 mt-1">
              12 characters = Persona Moral, 13 characters = Persona Física.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Régimen Fiscal</label>
              <input
                value={regimen}
                onChange={(e) => setRegimen(e.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder={rfcType === "PM" ? "Select regimen for Persona Moral" : "Select regimen for Persona Física"}
              />
              <p className="text-xs text-neutral-500 mt-1">Auto-restrict based on RFC length (PF/PM).</p>
            </div>
            <div>
              <label className="block text-sm font-medium">Uso CFDI</label>
              <input
                value={uso}
                onChange={(e) => setUso(e.target.value)}
                className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                placeholder="G01, G03, P01…"
              />
              <p className="text-xs text-neutral-500 mt-1">Use SAT catalog values.</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Optional CSF (Constancia)</label>
            <input type="file" onChange={onChooseFile} className="mt-2 text-sm" />
            {csfName && <p className="text-xs text-neutral-600 mt-1">Attached: {csfName}</p>}
          </div>
        </section>
      )}

      {/* Footer actions */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-ghost">Back</button>
        <button
          type="submit"
          disabled={cfdiAllowed && !!rfcError}
          className="btn btn-primary disabled:opacity-60"
        >
          Continue
        </button>
      </div>
    </form>
  );
}
