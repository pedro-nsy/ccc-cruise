import Hero from "./Hero";
import Highlights from "./Highlights";
import Cta from "./Cta";

export default function Page() {
  return (
    <div className="hero-gradient">
      <Hero />
      <Highlights />
      <Cta />
    </div>
  );
}
