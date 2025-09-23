export default function Highlights() {
  return (
    <section id="learn" className="container py-10 md:py-16">
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        <div className="rounded-2xl border p-6 bg-white/60 backdrop-blur">
          <h2 className="text-xl font-semibold">Itinerary Highlights</h2>
          <p className="mt-2 text-neutral-700">
            Western Caribbean · 7 nights · family-friendly onboard experience.
          </p>
        </div>

        <div className="rounded-2xl border p-6 bg-white/60 backdrop-blur">
          <h2 className="text-xl font-semibold">Pricing Overview</h2>
          <p className="mt-2 text-neutral-700">
            Public, Early Bird, and Staff/Artist pricing available.
          </p>
        </div>

        <div className="rounded-2xl border p-6 bg-white/60 backdrop-blur">
          <h2 className="text-xl font-semibold">Testimonials</h2>
          <p className="mt-2 italic text-neutral-700">
            “Best week ever—beautiful music and community.”
          </p>
        </div>
      </div>
    </section>
  );
}
