"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Method =
  | "card"
  | "bank_mx"
  | "cash_mx"
  | "cash_usd"
  | "other";

type Cfdi = {
  need: boolean;
  personType?: "FISICA" | "MORAL";
  rfc?: string;
  razon?: string;
  regimen?: string;
  uso?: string;
  zip?: string;
  email?: string;
  csfName?: string;
  csfDataUrl?: string; // temp client-side
};

// ---- SAT catalogs (as provided) ----
const REGIMEN_MORAL = [
  ["601","General de Ley Personas Morales"],
  ["603","Personas Morales con Fines no Lucrativos"],
  ["607","Enajenación o Adquisición de Bienes"],
  ["609","Consolidación"],
  ["620","Sociedades Cooperativas de Producción que optan por diferir sus ingresos"],
  ["622","Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras"],
  ["623","Opcional para Grupos de Sociedades"],
  ["624","Coordinados"],
  ["626","Régimen Simplificado de Confianza (RESICO)"],
  ["628","Hidrocarburos"],
];

const REGIMEN_FISICA = [
  ["605","Sueldos y Salarios e Ingresos Asimilados a Salarios"],
  ["606","Arrendamiento"],
  ["607","Enajenación o Adquisición de Bienes"],
  ["608","Demás ingresos"],
  ["610","Residentes en el Extranjero sin Establecimiento Permanente en México"],
  ["611","Ingresos por Dividendos (socios y accionistas)"],
  ["612","Personas Físicas con Actividades Empresariales y Profesionales"],
  ["614","Ingresos por intereses"],
  ["615","Régimen de los ingresos por obtención de premios"],
  ["616","Sin obligaciones fiscales"],
  ["621","Incorporación Fiscal"],
  ["622","Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras"],
  ["625","Régimen de Actividades con ingresos a través de Plataformas Tecnológicas"],
  ["626","Régimen Simplificado de Confianza (RESICO)"],
];

const USO_CFDI = [
  ["G01","Adquisición de mercancías"],
  ["G02","Devoluciones, descuentos o bonificaciones"],
  ["G03","Gastos en general"],
  ["I01","Construcciones"],
  ["I02","Mobiliario y equipo de oficina por inversiones"],
  ["I03","Equipo de transporte"],
  ["I04","Equipo de cómputo y accesorios"],
  ["I05","Dados, troqueles, moldes, matrices y herramental"],
  ["I06","Comunicaciones telefónicas"],
  ["I07","Comunicaciones satelitales"],
  ["I08","Otra maquinaria y equipo"],
  ["D01","Honorarios médicos, dentales y gastos hospitalarios"],
  ["D02","Gastos médicos por incapacidad o discapacidad"],
  ["D03","Gastos funerarios"],
  ["D04","Donativos"],
  ["D05","Intereses reales por créditos hipotecarios (casa habitación)"],
  ["D06","Aportaciones voluntarias al SAR"],
  ["D07","Primas por seguros de gastos médicos"],
  ["D08","Gastos de transportación escolar obligatoria"],
  ["D09","Depósitos para el ahorro, planes de pensiones"],
  ["D10","Pagos por servicios educativos (colegiaturas)"],
  ["S01","Sin efectos fiscales"],
  ["CP01","Pagos"],
  ["CN01","Nómina"],
];

// RFC: 13 = FÍSICA, 12 = MORAL
function validateRFC(raw: string): { ok: boolean; type?: "FISICA"|"MORAL" } {
  const v = (raw || "").toUpperCase().trim();
  const fisica = /^[A-Z&Ñ]{4}\d{6}[A-Z0-9]{3}$/;   // 13 chars
  const moral  = /^[A-Z&Ñ]{3}\d{6}[A-Z0-9]{3}$/;   // 12 chars
  if (fisica.test(v)) return { ok: true, type: "FISICA" };
  if (moral.test(v))  return { ok: true, type: "MORAL"  };
  return { ok: false };
}

export default function Page() {
  const [holdExpired, setHoldExpired] = useState(false);
  const [deadline, setDeadline] = useState<string>("");
  useEffect(() => {
    setHoldExpired(isHoldExpired());
    setDeadline(holdDeadlineLabel());
  }, []);

  const router = useRouter();

  // state
  const [loaded, setLoaded] = useState(false);
  const [amountDueToday, setAmountDueToday] = useState(0);
  const [payMode, setPayMode] = useState<"DEPOSIT"|"FULL">("DEPOSIT");
  const [method, setMethod] = useState<Method | null>(null);
  const [ackNonRefund, setAckNonRefund] = useState(false);
  const [ackTerms, setAckTerms] = useState(false);
  const [cfdi, setCfdi] = useState<Cfdi>({ need: false });

  // non-refundable baseline for FULL (from Review)
  const [nonRefundableBase, setNonRefundableBase] = useState<number | null>(null);

  // hydrate from localStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
    const intent = draft?.paymentIntent || {};
    setAmountDueToday(intent.amountDueToday || 0);
    setPayMode(intent.payMode || "DEPOSIT");
    // accept either nonRefundableBase or depositBaseline (fallback)
    if (typeof intent.nonRefundableBase === "number") {
      setNonRefundableBase(intent.nonRefundableBase);
    } else if (typeof intent.depositBaseline === "number") {
      setNonRefundableBase(intent.depositBaseline);
    }
    if (intent.cfdi) setCfdi(intent.cfdi);
    setLoaded(true);
  }, []);

  function back() { router.push("/booking/addons"); }
  function canUseCfdi(m: Method | null) { return m === "card" || m === "bank_mx"; }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) { setCfdi((c) => ({ ...c, csfName: undefined, csfDataUrl: undefined })); return; }
    const reader = new FileReader();
    reader.onload = () => setCfdi((c) => ({ ...c, csfName: file.name, csfDataUrl: String(reader.result || "") }));
    reader.readAsDataURL(file);
  }

  // RFC detection (HOOKS BEFORE ANY EARLY RETURN)
  const rfcState = useMemo(() => {
    if (!cfdi.rfc) return { ok:false, type: undefined as ("FISICA"|"MORAL"|undefined) };
    return validateRFC(cfdi.rfc);
  }, [cfdi.rfc]);

  // sync inferred type + filter regimen
  useEffect(() => {
    if (!cfdi.need) return;
    if (!rfcState.ok) return;
    setCfdi((c) => {
      const nextType = rfcState.type;
      if (!nextType) return c;
      if (c.personType === nextType) return c;
      const validList = nextType === "FISICA" ? REGIMEN_FISICA : REGIMEN_MORAL;
      const stillValid = validList.some(([code]) => code === c.regimen);
      return { ...c, personType: nextType, regimen: stillValid ? c.regimen : "" };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rfcState.ok, rfcState.type, cfdi.need]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-6 text-center text-neutral-500">
        Loading payment…
      </div>
    );
  }

  // fee + totals
  const base = amountDueToday;
  const fee = method === "card" ? Math.round(base * 0.04) : 0; // placeholder 4%
  const totalWithFee = base + fee;

  // refundable split if FULL and baseline known
  const showSplit =
    payMode === "FULL" &&
    typeof nonRefundableBase === "number" &&
    nonRefundableBase >= 0 &&
    nonRefundableBase <= totalWithFee;

  const nonRefund = showSplit ? nonRefundableBase! : base; // fallback to base if unknown
  const refundable = showSplit ? Math.max(totalWithFee - nonRefundableBase!, 0) : 0;

  const invalidFullWithDeposit = false; // deposit_mx removed
  const continueDisabled = !method || !ackNonRefund || !ackTerms || invalidFullWithDeposit;

  function next(e: React.FormEvent) {
    e.preventDefault();
    if (!method) return;
    if (typeof window !== "undefined") {
      const draft = JSON.parse(localStorage.getItem("ccc-draft") || "{}");
      const nextIntent = {
        ...(draft.paymentIntent || {}),
        method,
        amountDueToday,
        payMode,
        nonRefundableBase, // keep whatever we had (or null)
        cfdi: canUseCfdi(method) ? cfdi : { need: false },
      };
      localStorage.setItem("ccc-draft", JSON.stringify({ ...draft, paymentIntent: nextIntent }));
    }
    if (method === "card") {
      alert("Redirecting to Stripe checkout with fee included…");
    } else {
      alert("Confirming method and showing instructions…");
    }
  }

  return (
    <form onSubmit={next} className="mx-auto max-w-2xl space-y-8">
      {/* Header */}
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Complete your payment</h1>
        <p className="text-neutral-700">Choose how you’d like to pay the amount due today.</p>
        <p className="text-sm text-neutral-600">When you finish, we’ll email your confirmation.</p>
      </header>
{holdExpired ? (
  <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
    Your 48h business-day hold has expired. Please review availability again before attempting payment.
  </div>
) : (
  <div className="rounded-xl border bg-neutral-50 p-4 text-sm">
    Hold active — reserved until <strong>{deadline}</strong> (business days).
  </div>
)}

      {/* Amount due */}
      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <h3 className="text-lg font-medium">Amount due now</h3>

        <div className="flex items-center justify-between">
          <div className="text-neutral-600">
            {payMode === "FULL" ? "Full payment" : "Deposit"} (non-refundable portion applies)
          </div>
          <div className="text-xl font-semibold">MXN {base.toLocaleString()}</div>
        </div>

        {/* NEW: tiny non-refundable line right under the amount (only when paying in full and we know the baseline) */}
        

        {method === "card" && (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-neutral-600">Processing fee (4%)</div>
              <div className="font-medium">MXN {fee.toLocaleString()}</div>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <div>Total charged today</div>
              <div>{`MXN ${totalWithFee.toLocaleString()}`}</div>
            </div>
          </div>
        )}

        {showSplit && (
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-neutral-600">Non-refundable portion (deposit)</div>
              <div className="font-medium">MXN {nonRefund.toLocaleString()}</div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-neutral-600">Potentially refundable later*</div>
              <div className="font-medium">MXN {refundable.toLocaleString()}</div>
            </div>
            <div className="text-xs text-neutral-500">
              *Refunds are subject to the cancellation policy and timelines.
            </div>
          </div>
        )}
      </section>

      {/* Methods */}
      <section className="rounded-2xl border bg-white p-6 space-y-4">
        <h3 className="text-lg font-medium">Select a payment method</h3>
        <div className="space-y-3">
          {/* Card */}
          <label className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="radio" name="method" value="card" checked={method === "card"} onChange={() => setMethod("card")} />
              <div className="font-medium">Credit / Debit Card</div>
            </div>
            <div className="text-sm text-neutral-600">A processing fee of <strong>4%</strong> is added to the amount you pay today.</div>
            {method === "card" && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                Your card will be processed securely by Stripe.
              </div>
            )}
          </label>

          {/* Bank transfer MXN */}
          <label className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="radio" name="method" value="bank_mx" checked={method === "bank_mx"} onChange={() => setMethod("bank_mx")} />
              <div className="font-medium">Bank Transfer — Mexico (MXN)</div>
            </div>
            <div className="text-sm text-neutral-600">No processing fee.</div>
            {method === "bank_mx" && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                We’ll show account details after you confirm. Complete within 48h (business days) and email the receipt with your booking ID.
              </div>
            )}
          </label>

          {/* Cash at office — MXN */}
          <label className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="radio" name="method" value="cash_mx" checked={method === "cash_mx"} onChange={() => setMethod("cash_mx")} />
              <div className="font-medium">Cash at InterTravel office — MXN</div>
            </div>
            <div className="text-sm text-neutral-600">No processing fee. Pay in person.</div>
            {method === "cash_mx" && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                We’ll schedule a time at the InterTravel office in Chihuahua. Bring your booking ID and ID.
              </div>
            )}
          {method === "cash_mx" && deadline ? (<div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">Please complete payment by <strong>{deadline}</strong>.</div>) : null}</label>

          {/* Cash at office — USD */}
          <label className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="radio" name="method" value="cash_usd" checked={method === "cash_usd"} onChange={() => setMethod("cash_usd")} />
              <div className="font-medium">Cash at InterTravel office — USD</div>
            </div>
            <div className="text-sm text-neutral-600">No processing fee. Pay in person.</div>
            {method === "cash_usd" && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                We’ll calculate the exact USD amount at the office using the day’s rate.
              </div>
            )}
          {method === "cash_usd" && deadline ? (<div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">Please complete payment by <strong>{deadline}</strong>.</div>) : null}</label>

          {/* Other (contact us) */}
          <label className="flex flex-col gap-2 rounded-xl border p-4 hover:border-neutral-300 cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="radio" name="method" value="other" checked={method === "other"} onChange={() => setMethod("other")} />
              <div className="font-medium">Other</div>
            </div>
            <div className="text-sm text-neutral-600">No processing fee.</div>
            {method === "other" && (
              <div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">
                If none of these work for you, choose this option and we’ll contact you with alternatives.
              </div>
            )}
          {method === "other" && deadline ? (<div className="rounded-xl border bg-neutral-50 p-3 text-sm text-neutral-700">If you choose this method, please contact us before <strong>{deadline}</strong>.</div>) : null}</label>
        </div>
      </section>

      {/* CFDI (Factura Electrónica) */}
      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <h3 className="text-lg font-medium">CFDI (Factura Electrónica)</h3>

        {canUseCfdi(method) ? (
          <>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfdi.need} onChange={(e) => setCfdi((c) => ({ ...c, need: e.target.checked }))} />
              <span>I need a CFDI (Factura Electrónica)</span>
            </label>

            {cfdi.need && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <label className="block">
                  <span className="block text-sm font-medium">RFC</span>
                  <input
                    className={"mt-2 w-full rounded-xl border px-3 py-2 uppercase focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 " +
                      (cfdi.rfc && !rfcState.ok ? "border-red-300" : "border-neutral-300")}
                    placeholder="RFC (12 o 13 caracteres)"
                    value={cfdi.rfc ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, rfc: (e.target.value || '').toUpperCase() }))}
                  />
                  {cfdi.rfc && !rfcState.ok && (
                    <p className="text-xs text-red-700 mt-1">RFC inválido. Personas Morales = 12, Personas Físicas = 13.</p>
                  )}
                  {rfcState.ok && rfcState.type && (
                    <p className="text-xs text-neutral-500 mt-1">Detectado: Persona {rfcState.type === "MORAL" ? "Moral" : "Física"}.</p>
                  )}
                </label>

                <label className="block md:col-span-1">
                  <span className="block text-sm font-medium">Razón social / Nombre</span>
                  <input
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="Razón social o nombre"
                    value={cfdi.razon ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, razon: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-medium">Régimen fiscal</span>
                  <select
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    value={cfdi.regimen ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, regimen: e.target.value }))}
                  >
                    <option value="">— Selecciona —</option>
                    {(rfcState.type === "FISICA" ? REGIMEN_FISICA
                      : rfcState.type === "MORAL" ? REGIMEN_MORAL
                      : [...REGIMEN_FISICA, ...REGIMEN_MORAL]
                    ).map(([code,label]) => (
                      <option key={code} value={code}>{code} — {label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium">Uso CFDI</span>
                  <select
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    value={cfdi.uso ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, uso: e.target.value }))}
                  >
                    <option value="">— Selecciona —</option>
                    {USO_CFDI.map(([code,label]) => (
                      <option key={code} value={code}>{code} — {label}</option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="block text-sm font-medium">Código Postal</span>
                  <input
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="ZIP"
                    value={cfdi.zip ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, zip: e.target.value }))}
                  />
                </label>

                <label className="block md:col-span-1">
                  <span className="block text-sm font-medium">Email para CFDI</span>
                  <input
                    type="email"
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 lowercase focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    placeholder="facturacion@ejemplo.com"
                    value={cfdi.email ?? ""}
                    onChange={(e) => setCfdi((c)=>({ ...c, email: (e.target.value || '').toLowerCase() }))}
                  />
                </label>

                <label className="block md:col-span-2">
                  <span className="block text-sm font-medium">Subir CSF (Constancia de Situación Fiscal)</span>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="mt-2 w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                    onChange={onFile}
                  />
                  {cfdi.csfName && (
                    <p className="text-xs text-neutral-500 mt-1">Archivo: {cfdi.csfName}</p>
                  )}
                </label>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-600">CFDI (Factura Electrónica) isn’t available for this payment method.</p>
        )}
      </section>

      {/* Acknowledgements */}
      <section className="rounded-2xl border bg-white p-6 space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ackNonRefund} onChange={(e) => setAckNonRefund(e.target.checked)} />
          <span>I understand that the deposit portion is non-refundable.</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ackTerms} onChange={(e) => setAckTerms(e.target.checked)} />
          <span>I have read and accept the <a className="underline" href="#" target="_blank">Terms & Conditions</a> and <a className="underline" href="#" target="_blank">Privacy Policy</a>.</span>
        </label>
      </section>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button type="button" onClick={back} className="btn btn-ghost">Back</button>
        <button
          type="submit"
          disabled={continueDisabled}
          className="btn btn-primary disabled:opacity-60"
         disabled={holdExpired}>
          {method === "card"
            ? `Pay ${"MXN " + totalWithFee.toLocaleString()} with card`
            : "Confirm payment method"}
        </button>
      </div>
    </form>
  );
}

import { isHoldExpired, holdDeadlineLabel } from "../../../lib/hold/client";
