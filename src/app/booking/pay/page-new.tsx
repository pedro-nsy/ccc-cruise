"use client";
import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

/** ---------- Types ---------- */
type PayMode = "DEPOSIT" | "FULL";
type Method = "CARD_MXN" | "BANK_MXN" | "CASH_MXN" | "CASH_USD" | "OTHER";

type PaymentIntent = {
  payMode?: PayMode;
  amountDueToday?: number;      // from Review (baseline without card fee)
  estimateTotal?: number;
  nonRefundableBase?: number;   // deposit portion (for FULL: the non-refundable part)
  depositBaseline?: number;     // same as above; used for display
};

type Draft = {
  lead?: { fullName?: string; email?: string; phone?: string };
  paymentIntent?: PaymentIntent & { method?: Method; cardFeeApplied?: boolean; cardFeeAmount?: number };
  // For non-card: optional proof and CFDI details
  payProofUrl?: string | null;
  cfdi?: {
    rfc?: string;
    regimen?: string;
    uso?: string;
    csfUrl?: string | null;
  } | null;
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
function fmt(n: number) { return `MXN ${Math.round(n).toLocaleString()}`; }
function calcCardFee(baseToday: number) { return Math.round(baseToday * 0.04); } // placeholder 4%

function isValidRFC(rfc: string) {
  const up = rfc?.toUpperCase().trim();
  if (!up) return false;
  return up.length === 12 || up.length === 13;
}

/** ---------- Page ---------- */
export default function Page() {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>({});
  const [loaded, setLoaded] = useState(false);

  // form state
  const [method, setMethod] = useState<Method>("CARD_MXN");
  const [ackDeposit, setAckDeposit] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);

  // CFDI form (only for CARD_MXN and BANK_MXN)
  const [rfc, setRfc] = useState("");
  const [regimen, setRegimen] = useState("");
  const [uso, setUso] = useState("");
  const [csfUrl, setCsfUrl] = useState("");

  // Proof upload (Bank/Cash only)
  const [proofUrl, setProofUrl] = useState("");

  useEffect(() => {
    const d = readDraft();
    setDraft(d);
    const m = d?.paymentIntent;
    // default method: CARD
    setMethod((d?.paymentIntent as any)?.method ?? "CARD_MXN");
    setLoaded(true);
  }, []);

  const payMode: PayMode = draft?.paymentIntent?.payMode ?? "DEPOSIT";
  const baselineToday = draft?.paymentIntent?.amountDueToday ?? 0;
  const nonRefundableBase = draft?.paymentIntent?.nonRefundableBase ?? 0;
  const estimateTotal = draft?.paymentIntent?.estimateTotal ?? 0;

  const cardFee = useMemo(() => method === "CARD_MXN" ? calcCardFee(baselineToday) : 0, [method, baselineToday]);
  const dueToday = baselineToday + cardFee;

  const showCfdi = method === "CARD_MXN" || method === "BANK_MXN";

  function back() {
    router.back(); // Back just goes back to the previous page in our flow
  }

  function next(e: React.FormEvent) {
    e.preventDefault();

    // Guards
    if (!ackDeposit || !ackTerms) return;

    // Persist selection
    const nextDraft: Draft = {
      ...draft,
      paymentIntent: {
        ...draft.paymentIntent,
        method,
        cardFeeApplied: method === "CARD_MXN",
        cardFeeAmount: cardFee
      },
      cfdi: showCfdi ? {
        rfc: rfc?.trim() || undefined,
        regimen: regimen?.trim() || undefined,
        uso: uso?.trim() || undefined,
        csfUrl: csfUrl?.trim() || undefined
      } : null,
      payProofUrl: (method === "BANK_MXN" || method === "CASH_MXN" || method === "CASH_USD") ? (proofUrl?.trim() || null) : null
    };

    writeDraft(nextDraft);

    // For now, simulate:
    // - CARD: create Checkout Session later (server stub)
    // - Others: mark a pending payment and show instructions/hold
    router.push("/booking/confirm");
  }

  if (!loaded) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading payment…
      </div>
    );
  }

  return (
    <form onSubmit={next} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">{payMode === "DEPOSIT" ? "Deposit (non-refundable)" : "Amount due now"}</h1>
        <p className="text-neutral-700">
          Choose your payment method. For non-card methods we hold your price for <strong>48 business hours</strong>.
        </p>
      </header>

      {/* Amount card */}
      <section className="rounded-2xl border bg-white p-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-neutral-600">Value</div>
          <div className="text-2xl font-semibold">{fmt(dueToday)}</div>
        </div>
        {method === "CARD_MXN" && (
          <div className="mt-2 text-xs text-neutral-600">
            Includes a 4% card processing fee of <span className="font-medium text-neutral-700">{fmt(cardFee)}</span>.
          </div>
        )}
        {payMode === "FULL" && (
          <div className="mt-3 text-xs text-neutral-500">
            Non-refundable portion (deposit): <span className="font-medium text-neutral-700">{fmt(nonRefundableBase)}</span>
          </div>
        )}
      </section>

      {/* Methods */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <div className="text-sm font-medium">Payment method</div>

        <div className="space-y-3">
          {/* CARD (MXN) */}
          <label className="block rounded-2xl border p-5 bg-white cursor-pointer data-[active=true]:border-blue-600 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                 data-active={method==="CARD_MXN"}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Credit / Debit Card — MXN</div>
                <div className="text-neutral-600">Instant confirmation. CFDI available. 4% processing fee.</div>
              </div>
              <input type="radio" name="method" className="ml-3" checked={method==="CARD_MXN"} onChange={()=>setMethod("CARD_MXN")} />
            </div>
          </label>

          {/* BANK TRANSFER (MXN) */}
          <label className="block rounded-2xl border p-5 bg-white cursor-pointer data-[active=true]:border-blue-600 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                 data-active={method==="BANK_MXN"}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Bank Transfer — Mexico (MXN)</div>
                <div className="text-neutral-600">CFDI available. We hold your price for <strong>48 business hours</strong>.</div>
              </div>
              <input type="radio" name="method" className="ml-3" checked={method==="BANK_MXN"} onChange={()=>setMethod("BANK_MXN")} />
            </div>
          </label>

          {/* CASH (MXN) */}
          <label className="block rounded-2xl border p-5 bg-white cursor-pointer data-[active=true]:border-blue-600 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                 data-active={method==="CASH_MXN"}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Cash at InterTravel — MXN</div>
                <div className="text-neutral-600">No CFDI. We hold your price for <strong>48 business hours</strong>.</div>
              </div>
              <input type="radio" name="method" className="ml-3" checked={method==="CASH_MXN"} onChange={()=>setMethod("CASH_MXN")} />
            </div>
          </label>

          {/* CASH (USD) */}
          <label className="block rounded-2xl border p-5 bg-white cursor-pointer data-[active=true]:border-blue-600 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                 data-active={method==="CASH_USD"}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Cash at InterTravel — USD</div>
                <div className="text-neutral-600">No CFDI. MXN is calculated at the office at the day’s rate. 48 business-hour hold.</div>
              </div>
              <input type="radio" name="method" className="ml-3" checked={method==="CASH_USD"} onChange={()=>setMethod("CASH_USD")} />
            </div>
          </label>

          {/* OTHER */}
          <label className="block rounded-2xl border p-5 bg-white cursor-pointer data-[active=true]:border-blue-600 data-[active=true]:ring-2 data-[active=true]:ring-blue-100"
                 data-active={method==="OTHER"}>
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <div className="font-medium">Other / none of these</div>
                <div className="text-neutral-600">Contact us and we’ll help you complete your payment.</div>
              </div>
              <input type="radio" name="method" className="ml-3" checked={method==="OTHER"} onChange={()=>setMethod("OTHER")} />
            </div>
          </label>
        </div>

        {/* Method-specific inputs */}
        {method !== "CARD_MXN" && (
          <div className="mt-2 rounded-xl border bg-neutral-50 p-4 text-sm">
            <div className="font-medium mb-1">Instructions & proof</div>
            <p className="text-neutral-700 mb-2">
              We’ll hold your price for <strong>48 business hours</strong>. Upload a proof of payment so we can review it.
            </p>
            <label className="block text-sm font-medium">Proof URL (photo or PDF)</label>
            <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                   placeholder="https://…"
                   value={proofUrl}
                   onChange={e=>setProofUrl(e.target.value)} />
          </div>
        )}

        {showCfdi && (
          <div className="mt-2 rounded-xl border bg-neutral-50 p-4 text-sm">
            <div className="font-medium mb-1">CFDI (Factura Electrónica)</div>
            <p className="text-neutral-700 mb-2">Available for card and bank transfer payments in MXN.</p>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium">RFC</label>
                <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                       value={rfc} onChange={e=>setRfc(e.target.value.toUpperCase())} placeholder="12 or 13 characters" />
                {rfc && !isValidRFC(rfc) && <p className="text-xs text-red-700 mt-1">RFC must be 12 (Persona Moral) or 13 (Persona Física) characters.</p>}
              </div>
              <div>
                <label className="block text-sm font-medium">Régimen Fiscal</label>
                <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                       value={regimen} onChange={e=>setRegimen(e.target.value)} placeholder="Select per RFC type" />
                <p className="text-xs text-neutral-500 mt-1">We’ll validate this against your RFC type.</p>
              </div>
              <div>
                <label className="block text-sm font-medium">Uso CFDI</label>
                <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                       value={uso} onChange={e=>setUso(e.target.value)} placeholder="e.g., G03" />
              </div>
              <div>
                <label className="block text-sm font-medium">Optional CSF (Constancia)</label>
                <input className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                       value={csfUrl} onChange={e=>setCsfUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Acknowledgements */}
      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <div className="text-sm font-medium">Acknowledgements</div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={ackDeposit} onChange={()=>setAckDeposit(!ackDeposit)} />
          <span>I understand the deposit portion is <strong>non-refundable</strong>.</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" checked={ackTerms} onChange={()=>setAckTerms(!ackTerms)} />
          <span>I accept the <a className="underline" href="/legal/terms" target="_blank">Terms & Conditions</a> and <a className="underline" href="/legal/privacy" target="_blank">Privacy Policy</a>.</span>
        </label>
      </section>

      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-ghost">Back</button>
        <button type="submit" disabled={!ackDeposit || !ackTerms} className="btn btn-primary disabled:opacity-60">
          Continue
        </button>
      </div>
    </form>
  );
}
