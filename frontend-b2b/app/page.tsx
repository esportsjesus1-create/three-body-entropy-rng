import GamePortfolio from "@/components/GamePortfolio";
import FairComparison from "@/components/FairComparison";

export default function Home() {
  return (
    <>
      <div className="section-container py-20">
        <section id="hero" className="mb-20">
          <h1 className="ht-display text-center mb-8">
            Provably Fair Slots
          </h1>
          <p className="body-large text-center max-w-2xl mx-auto">
            Every Spin. Cryptographically Verified.
          </p>
        </section>
      </div>
      
      <GamePortfolio />
      
      <FairComparison />
    </>
  );
}
