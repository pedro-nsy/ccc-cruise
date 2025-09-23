"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type StartForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsappOk: boolean;
};

export default function Page() {
  const router = useRouter();

  const [form, setForm] = useState<StartForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    whatsappOk: true,
  });

  const [errors, setErrors] = useState<{ phone?: string; names?: string; email?: string }>({});

  function onChange<K extends keyof StartForm>(key: K, val: StartForm[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  // Basic E.164-friendly validation: + and 10-15 digits allowed
  function isValidPhone(v: string): boolean {
    const trimmed = v.replace(/\s+/g, "");
    // Allow formats like: +5215551234567 or 5551234567 (we still prefer +country)
    const e164ish = /^\+?[0-9\-()]{10,17}$/;
    return e164ish.test(trimmed);
  }

  function isValidEmail(v: string): boolean {
    // Allow browser to validate primarily; this is a thin guard
    return /\S+@\S+\.\S+/.test(v);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};

    if (!form.firstName.trim() || !form.lastName.trim()) {
      nextErrors.names = "Please enter both first and last names (as they appear on your passport).";
    }
    if (!isValidEmail(form.email)) {
      nextErrors.email = "Enter a valid email address.";
    }
    if (!isValidPhone(form.phone)) {
      nextErrors.phone = "Enter a valid phone number (include country code if possible, e.g., +52…).";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Send to server: /api/booking/start (server will persist to Supabase)
    try {
      const res = await fetch("/api/booking/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          whatsappOk: !!form.whatsappOk,
        }),
      });

      if (!res.ok) {
        console.error("Failed to start booking", await res.text());
        // Soft fail: still allow moving on to group-size to reduce friction
        // (We can tighten this once the API is confirmed.)
      }

      // Route to group size regardless; API will create/attach server-side draft
      router.push("/booking/group-size");
    } catch (err) {
      console.error("Network error starting booking:", err);
      router.push("/booking/group-size");
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-xl sm:max-w-2xl space-y-8">
      <header className="text-center space-y-3">
        <h1 className="text-2xl md:text-3xl font-semibold">Let’s get your booking started</h1>
        <p className="text-neutral-700">
          This first step is for the <strong>lead passenger</strong> — the person responsible for this booking.
        </p>
        <p className="text-neutral-600 text-sm">
          As lead passenger, you’ll receive booking confirmations, payment reminders, and updates. You’ll also have
          access to the booking portal where you can manage your group’s details.
          <br />
          Later in the process, you’ll be able to add the rest of your travelers.
        </p>
      </header>

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 space-y-6">
        {/* Lead passenger name */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Lead passenger name</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase"
              placeholder="First name(s)"
              value={form.firstName}
              onChange={(e) => onChange("firstName", e.target.value.toUpperCase())}
              required
              autoComplete="given-name"
              inputMode="text"
            />
            <input
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 uppercase"
              placeholder="Last name(s)"
              value={form.lastName}
              onChange={(e) => onChange("lastName", e.target.value.toUpperCase())}
              required
              autoComplete="family-name"
              inputMode="text"
            />
          </div>
          <p className="text-xs text-neutral-500 mt-1">Please use the name exactly as it appears on your passport.</p>
          {errors.names && <p className="text-xs text-red-700 mt-1">{errors.names}</p>}
        </div>

        {/* Email */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Email address</label>
          <input
            type="email"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 lowercase mt-2"
            placeholder="name@example.com"
            value={form.email}
            onChange={(e) => onChange("email", e.target.value.toLowerCase())}
            required
            autoComplete="email"
            inputMode="email"
          />
          <p className="text-xs text-neutral-500 mt-1">
            This will be used for your booking confirmation and for logging into the portal.
          </p>
          {errors.email && <p className="text-xs text-red-700 mt-1">{errors.email}</p>}
        </div>

        {/* Phone */}
        <div className="space-y-2">
          <label className="block text-sm font-medium">Phone number</label>
          <input
            type="tel"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 bg-white text-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 mt-2"
            placeholder="+52 1 555 123 4567"
            value={form.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            required
            inputMode="tel"
            pattern="^\+?[0-9\-()\s]{10,17}$"
            aria-invalid={!!errors.phone}
          />
          <p className="text-xs text-neutral-500 mt-1">
            If possible, use a number with WhatsApp so we can reach you quickly about your booking.
          </p>

          {/* WhatsApp group opt-in */}
          <label className="mt-2 inline-flex items-start gap-2">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-neutral-300 focus:outline-none focus:ring-2 focus:ring-blue-200"
              checked={form.whatsappOk}
              onChange={(e) => onChange("whatsappOk", e.target.checked)}
            />
            <span className="text-sm text-neutral-700">
              I’m okay with being added to a WhatsApp group later for important updates and mass communication.
            </span>
          </label>

          {errors.phone && <p className="text-xs text-red-700 mt-1">{errors.phone}</p>}
        </div>

        {/* Note: promo selection removed by rule change */}
      </div>

      {/* Privacy reassurance */}
      <p className="text-xs text-neutral-500 text-center">
        We’ll never share your contact details outside of this booking process.
      </p>

      <div className="flex items-center justify-between">
        <a href="/" className="btn btn-ghost">Back</a>
        <button type="submit" className="btn btn-primary disabled:opacity-60">Continue</button>
      </div>
    </form>
  );
}
