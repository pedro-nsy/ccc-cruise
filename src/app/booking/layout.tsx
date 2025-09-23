export default function BookingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container max-w-2xl md:max-w-3xl mx-auto px-4 py-8 md:py-12">
      {children}
    </div>
  );
}
