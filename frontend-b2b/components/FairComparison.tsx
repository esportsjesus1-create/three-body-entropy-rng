"use client";

import ComparisonRow from "./ComparisonRow";
import { comparisonData } from "@/data/comparison";

export default function FairComparison() {
  return (
    <section
      className="py-16 md:py-24 bg-secondary-bg"
      aria-labelledby="comparison-section-title"
    >
      <div className="section-container">
        <h2
          id="comparison-section-title"
          className="h2-section text-center mb-4"
        >
          Why We&apos;re Fairer
        </h2>
        
        <p className="body-large text-center max-w-3xl mx-auto mb-12">
          Compare our Three-Body Entropy system with traditional RNG and standard provably fair solutions.
        </p>

        <div className="overflow-x-auto">
          <table
            className="w-full min-w-[640px] border-collapse"
            role="table"
            aria-label="Fairness comparison table"
          >
            <thead>
              <tr className="border-b-2 border-primary/40">
                <th
                  scope="col"
                  className="py-4 px-4 text-left text-text-primary font-bold uppercase tracking-wide"
                >
                  Feature
                </th>
                <th
                  scope="col"
                  className="py-4 px-4 text-left text-text-secondary font-bold uppercase tracking-wide"
                >
                  Traditional RNG
                </th>
                <th
                  scope="col"
                  className="py-4 px-4 text-left text-text-secondary font-bold uppercase tracking-wide"
                >
                  Provably Fair
                </th>
                <th
                  scope="col"
                  className="py-4 px-4 text-left text-secondary font-bold uppercase tracking-wide bg-primary/10"
                >
                  Three-Body System
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((item) => (
                <ComparisonRow
                  key={item.id}
                  feature={item.feature}
                  traditional={item.traditional}
                  provablyFair={item.provablyFair}
                  threeBody={item.threeBody}
                  traditionalPass={item.traditionalPass}
                  provablyFairPass={item.provablyFairPass}
                  threeBodyPass={item.threeBodyPass}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-12 text-center">
          <p className="body-regular mb-6">
            Our Three-Body Entropy system provides the highest level of transparency and mathematical proof in the industry.
          </p>
          <a
            href="/verify"
            className="btn-secondary inline-block"
            aria-label="Verify a spin"
          >
            Verify a Spin
          </a>
        </div>
      </div>
    </section>
  );
}
