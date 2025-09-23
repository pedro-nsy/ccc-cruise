"use client";
import Link from "next/link";

export default function Hero() {
  return (
    <section className="container py-12 md:py-20 text-center">
      <div className="mx-auto max-w-3xl">
        <h1>Christian Community Choir Homecoming Cruise 2026</h1>
        <p className="mt-3 text-base md:text-lg text-neutral-700">
          April 5–12, 2026 · Allure of the Seas
        </p>
        <p className="mt-4 text-lg md:text-xl text-neutral-800">
          <span className="font-medium">Sing. Sail. Celebrate</span> — together.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/booking/start" className="btn btn-primary w-full sm:w-auto">
            Start Booking
          </Link>
          <a href="#learn" className="btn btn-ghost w-full sm:w-auto">
            Learn More
          </a>
        </div>
      </div>
    </section>
  );
}
