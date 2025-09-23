"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StartForm = {
  fullName: string;
  email: string;
  phone: string;
  hasPromo: "yes" | "no";
};

export default function Page() {
  const router = useRouter();
  const [form, setForm] = useState<StartForm>({
    fullName: "",
    email: "",
    phone: "",
    hasPromo: "no",
  });

  const [firstNames, setFirstNames] = useState("");
  const [lastNames, setLastNames] = useState("");

  const onChange = (patch: Partial<StartForm>) =>
    setForm((f) => ({ ...f, ...patch }));

  function updateFullName(nextFirst: string, nextLast: string) {
    const full = `${(nextFirst || "").trim()} ${(nextLast || "").trim()}`
      .replace(/\s+/g, " ")
      .trim()
      .toUpperCase();
    onChange({ fullName: full });
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();

    const draft =
      typeof window !== "undefined" && window.localStorage
        ? JSON.parse(localStorage.getItem("ccc-draft") || "{}")
        : {};
    const next = {
      ...draft,
      lead: {
        fullName: form.fullName,
        email: form.email.toLowerCase(),
        phone: form.phone,
      },
      intent: { hasPromo: form.hasPromo === "yes" },
    };
    if (typeof window !== "undefined" && window.localStorage) {
      localStorage.setItem("ccc-draft", JSON.stringify(next));
    }

    router.push(
      form.hasPromo === "yes" ? "/booking/group-size" : "/booking/group-size"
    );
  };

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Let’s get your booking started
        </h1>
        <p className="text-neutral-700">
          This first step is for the <strong>lead passenger</strong> — the person
          responsible for this booking.
        </p>
        <p className="text-neutral-600 text-sm">
          As lead passenger, you’ll receive booking confirmations, payment
          reminders, and updates. You’ll also have access to the booking portal
          where you can manage your group’s details.
          <br />
          Later in the process, you’ll be able to add the rest of your travelers.
        </p>
      </header>

      <div className="rounded-2xl border p-6 bg-white space-y-6">
        {/* Lead passenger name */}
        <div>
          <label className="block text-sm font-medium">Lead passenger name</label>
          <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border px-3 py-2 uppercase"
              placeholder="First name(s)"
              value={firstNames}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setFirstNames(v);
                updateFullName(v, lastNames);
              }}
              required
              autoComplete="given-name"
            />
            <input
              className="w-full rounded-xl border px-3 py-2 uppercase"
              placeholder="Last name(s)"
              value={lastNames}
              onChange={(e) => {
                const v = e.target.value.toUpperCase();
                setLastNames(v);
                updateFullName(firstNames, v);
              }}
              required
              autoComplete="family-name"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Please use the name exactly as it appears on your passport.
          </p>
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium">Email address</label>
          <input
            type="email"
            className="mt-2 w-full rounded-xl border px-3 py-2 lowercase"
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => onChange({ email: e.target.value.toLowerCase() })}
            required
          />
          <p className="text-xs text-neutral-500 mt-1">
            This will be used for your booking confirmation and for logging into
            the portal.
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium">Phone number</label>
          <input
            className="mt-2 w-full rounded-xl border px-3 py-2"
            placeholder="+52 1 555 123 4567"
            value={form.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
            required
          />
          <p className="text-xs text-neutral-500 mt-1">
            We’ll only use this if we need to reach you quickly about your booking.
          </p>
        </div>

        {/* Promo code question */}
        <div>
          <label className="block text-sm font-medium">Do you have a promo code?</label>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onChange({ hasPromo: "yes" })}
              className={`rounded-xl border px-3 py-2 ${
                form.hasPromo === "yes"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange({ hasPromo: "no" })}
              className={`rounded-xl border px-3 py-2 ${
                form.hasPromo === "no"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white"
              }`}
            >
              No
            </button>
          </div>
          <p className="text-xs text-neutral-500 mt-2">
            Promo codes are provided to Choir Members, Artists, and Staff. If you
            received a code from CCC or the organizers, select “Yes” and you’ll
            enter it on the next step. Otherwise, choose “No” and continue with
            regular booking.
          </p>
        </div>
      </div>

      {/* Privacy reassurance */}
      <p className="text-xs text-neutral-500 text-center">
        We’ll never share your contact details outside of this booking process.
      </p>

      <div className="flex items-center justify-between">
        <a href="/" className="btn btn-ghost">
          Back
        </a>
        <button type="submit" className="btn btn-primary">
          Continue
        </button>
      </div>
    </form>
  );
}

