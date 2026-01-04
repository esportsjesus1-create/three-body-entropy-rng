"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const ThreeBodySimulation = dynamic(
  () => import("@/components/education/ThreeBodySimulation"),
  { ssr: false }
);
const ChaosDivergence = dynamic(
  () => import("@/components/education/ChaosDivergence"),
  { ssr: false }
);
const CommitRevealDemo = dynamic(
  () => import("@/components/education/CommitRevealDemo"),
  { ssr: false }
);
const FiveReelDemo = dynamic(
  () => import("@/components/education/FiveReelDemo"),
  { ssr: false }
);

export default function EducationPage() {
  const [activeSection, setActiveSection] = useState<string>("overview");

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "physics", label: "Three-Body Physics" },
    { id: "chaos", label: "Chaos & Unpredictability" },
    { id: "commit-reveal", label: "Commit-Reveal Protocol" },
    { id: "five-reels", label: "5-Reel Demo" },
    { id: "verification", label: "Verification" },
  ];

  return (
    <div className="min-h-screen bg-primary-bg">
      <div className="section-container py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Three-Body Entropy RNG
            </h1>
            <p className="text-lg text-text-secondary max-w-2xl mx-auto">
              Discover how chaos theory and cryptography combine to create 
              provably fair randomness that neither the house nor player can manipulate.
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 rounded-xl p-6 mb-8 border border-purple-500/30">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-full bg-purple-600/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15.536a5 5 0 001.414 1.414m2.828-9.9a9 9 0 0112.728 0" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Audio Deep Dive</h2>
                <p className="text-sm text-text-secondary">Listen to a 12-minute podcast explaining Three-Body RNG</p>
              </div>
            </div>
            <div className="bg-primary-bg/80 rounded-lg p-6">
              <div className="flex flex-col md:flex-row items-center gap-6">
                <a
                  href="https://notebooklm.google.com/notebook/82cb4928-089c-42e3-a777-60fa80fd8cf8/audio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-20 h-20 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-all hover:scale-105 shadow-lg shadow-purple-600/30 flex-shrink-0"
                >
                  <svg className="w-10 h-10 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </a>
                <div className="flex-1 text-center md:text-left">
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Understanding Three-Body Entropy RNG
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    Two AI hosts discuss the physics, cryptography, and verification process 
                    behind provably fair gaming. Perfect for learning while exploring the interactive demos.
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                    <span className="text-xs bg-purple-600/20 text-purple-300 px-3 py-1 rounded-full">
                      12:48 duration
                    </span>
                    <span className="text-xs bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full">
                      Podcast format
                    </span>
                    <span className="text-xs bg-green-600/20 text-green-300 px-3 py-1 rounded-full">
                      Powered by NotebookLM
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-700 flex flex-col sm:flex-row gap-3 justify-center">
                <a
                  href="https://notebooklm.google.com/notebook/82cb4928-089c-42e3-a777-60fa80fd8cf8/audio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-center"
                >
                  Listen Now
                </a>
                <a
                  href="https://notebooklm.google.com/notebook/82cb4928-089c-42e3-a777-60fa80fd8cf8/audio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary text-center"
                >
                  Open in NotebookLM
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeSection === section.id
                    ? "bg-purple-600 text-white"
                    : "bg-secondary-bg text-text-secondary hover:bg-gray-700"
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>

          {activeSection === "overview" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">What is Three-Body RNG?</h2>
                <p className="text-text-secondary mb-4">
                  Three-Body RNG is a provably fair random number generator that uses the chaotic 
                  dynamics of the three-body gravitational problem to generate unpredictable entropy. 
                  Combined with a cryptographic commit-reveal protocol, it ensures that neither the 
                  house nor the player can manipulate or predict outcomes.
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="text-3xl mb-2">🌌</div>
                    <h3 className="font-semibold text-white mb-1">Physics-Based</h3>
                    <p className="text-sm text-text-secondary">
                      Uses real gravitational physics simulations with RK4 integration
                    </p>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="text-3xl mb-2">🔐</div>
                    <h3 className="font-semibold text-white mb-1">Cryptographically Secure</h3>
                    <p className="text-sm text-text-secondary">
                      SHA-256 commitments ensure neither party can cheat
                    </p>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="text-3xl mb-2">✓</div>
                    <h3 className="font-semibold text-white mb-1">Fully Verifiable</h3>
                    <p className="text-sm text-text-secondary">
                      Every spin can be independently verified by anyone
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-secondary-bg rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Live Three-Body Simulation</h3>
                <p className="text-text-secondary mb-4">
                  Watch three gravitational bodies interact in real-time. The chaotic motion 
                  of these bodies generates the entropy used for random number generation.
                </p>
                <div className="flex justify-center">
                  <ThreeBodySimulation width={300} height={300} showTrails={true} />
                </div>
              </div>
            </div>
          )}

          {activeSection === "physics" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">The Three-Body Problem</h2>
                <p className="text-text-secondary mb-4">
                  The three-body problem is one of the oldest unsolved problems in physics. 
                  When three celestial bodies interact gravitationally, their motion becomes 
                  chaotic and fundamentally unpredictable, even with perfect knowledge of 
                  initial conditions.
                </p>
                <div className="bg-primary-bg rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-white mb-2">Newton&apos;s Law of Gravitation</h4>
                  <div className="font-mono text-center text-lg text-purple-400 py-4">
                    F = G × (m₁ × m₂) / r²
                  </div>
                  <p className="text-sm text-text-secondary">
                    Each body experiences gravitational force from the other two bodies, 
                    creating a complex system of coupled differential equations.
                  </p>
                </div>
                <div className="bg-primary-bg rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">RK4 Integration</h4>
                  <p className="text-sm text-text-secondary mb-2">
                    We use the Runge-Kutta 4th order method (RK4) to numerically integrate 
                    the equations of motion. This provides high accuracy while maintaining 
                    the chaotic properties of the system.
                  </p>
                  <div className="font-mono text-xs text-green-400 bg-gray-900 p-3 rounded overflow-x-auto">
                    k1 = f(t, y)<br/>
                    k2 = f(t + dt/2, y + dt×k1/2)<br/>
                    k3 = f(t + dt/2, y + dt×k2/2)<br/>
                    k4 = f(t + dt, y + dt×k3)<br/>
                    y_next = y + dt×(k1 + 2k2 + 2k3 + k4)/6
                  </div>
                </div>
              </div>

              <div className="bg-secondary-bg rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Extracting Entropy</h3>
                <p className="text-text-secondary mb-4">
                  After running the simulation for a fixed number of steps, we extract the 
                  angle (theta) between two bodies. This angle, combined with other state 
                  variables, is hashed to produce the final entropy value.
                </p>
                <div className="flex justify-center mb-4">
                  <ThreeBodySimulation 
                    width={250} 
                    height={250} 
                    showTrails={true}
                    onThetaUpdate={() => {}}
                  />
                </div>
                <div className="bg-primary-bg rounded-lg p-4">
                  <div className="font-mono text-sm text-text-secondary">
                    theta = atan2(body2.y - body1.y, body2.x - body1.x)<br/>
                    entropy = SHA256(theta + state_variables + house_seed)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "chaos" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Sensitive Dependence on Initial Conditions
                </h2>
                <p className="text-text-secondary mb-4">
                  The three-body system exhibits what mathematicians call &quot;sensitive dependence 
                  on initial conditions&quot; - popularly known as the butterfly effect. Even the 
                  tiniest difference in starting positions leads to completely different outcomes.
                </p>
              </div>

              <ChaosDivergence />

              <div className="bg-secondary-bg rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Why Chaos = Unpredictability</h3>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-primary-bg rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">For Players</h4>
                    <p className="text-sm text-text-secondary">
                      Even if you knew the exact algorithm and initial conditions, you cannot 
                      predict the outcome because the house seed is hidden until after you 
                      commit your client seed.
                    </p>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4">
                    <h4 className="font-semibold text-green-400 mb-2">For the House</h4>
                    <p className="text-sm text-text-secondary">
                      The house commits to their seed before knowing your input. They cannot 
                      change their seed after seeing yours, so they cannot manipulate the outcome.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === "commit-reveal" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  The Commit-Reveal Protocol
                </h2>
                <p className="text-text-secondary mb-4">
                  The commit-reveal protocol is a cryptographic technique that ensures fairness 
                  by preventing either party from manipulating the outcome. It works in three phases:
                </p>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-primary-bg rounded-lg p-4 border-l-4 border-yellow-500">
                    <div className="text-yellow-400 font-bold mb-2">Phase 1: Commit</div>
                    <p className="text-sm text-text-secondary">
                      Server generates house seed and publishes SHA-256(house_seed) as commitment
                    </p>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4 border-l-4 border-blue-500">
                    <div className="text-blue-400 font-bold mb-2">Phase 2: Player Input</div>
                    <p className="text-sm text-text-secondary">
                      Player provides their client seed, which influences the final outcome
                    </p>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4 border-l-4 border-green-500">
                    <div className="text-green-400 font-bold mb-2">Phase 3: Reveal</div>
                    <p className="text-sm text-text-secondary">
                      Server reveals house seed. Player verifies SHA-256(house_seed) = commitment
                    </p>
                  </div>
                </div>
              </div>

              <CommitRevealDemo />
            </div>
          )}

          {activeSection === "five-reels" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Independent Entropy Per Reel
                </h2>
                <p className="text-text-secondary mb-4">
                  For maximum fairness, each reel in our slot games gets its own independent 
                  three-body physics simulation. This means 5 separate commit-reveal cycles 
                  for a 5-reel slot, with no mathematical relationship between reel outcomes.
                </p>
                <div className="bg-primary-bg rounded-lg p-4">
                  <h4 className="font-semibold text-white mb-2">Concurrent Execution</h4>
                  <p className="text-sm text-text-secondary mb-2">
                    To maintain fast spin times, all 5 commits happen in parallel, followed 
                    by all 5 reveals in parallel. This reduces latency from 10 sequential 
                    round trips to just 2 parallel batches.
                  </p>
                  <div className="font-mono text-xs text-green-400 bg-gray-900 p-3 rounded">
                    <span className="text-gray-500">{"// Phase 1: 5 parallel commits"}</span><br/>
                    commits = await Promise.all([commit1, commit2, commit3, commit4, commit5])<br/>
                    <br/>
                    <span className="text-gray-500">{"// Phase 2: 5 parallel reveals"}</span><br/>
                    results = await Promise.all([reveal1, reveal2, reveal3, reveal4, reveal5])
                  </div>
                </div>
              </div>

              <FiveReelDemo />
            </div>
          )}

          {activeSection === "verification" && (
            <div className="space-y-6">
              <div className="bg-secondary-bg rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  How to Verify a Spin
                </h2>
                <p className="text-text-secondary mb-4">
                  Every spin produces a complete verification bundle that you can check 
                  independently. Here&apos;s the step-by-step process:
                </p>
                <div className="space-y-4">
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        1
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Verify Commitment</h4>
                        <p className="text-sm text-text-secondary mb-2">
                          Compute SHA-256(house_seed) and confirm it matches the commitment 
                          that was published before you provided your client seed.
                        </p>
                        <div className="font-mono text-xs text-green-400 bg-gray-900 p-2 rounded">
                          assert(SHA256(house_seed) === commitment)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        2
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Verify Entropy Derivation</h4>
                        <p className="text-sm text-text-secondary mb-2">
                          Confirm that the final entropy was correctly derived from the 
                          combination of house seed and your client seed.
                        </p>
                        <div className="font-mono text-xs text-green-400 bg-gray-900 p-2 rounded">
                          entropy = SHA256(house_seed + client_seed)
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-primary-bg rounded-lg p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                        3
                      </div>
                      <div>
                        <h4 className="font-semibold text-white mb-1">Verify Result Mapping</h4>
                        <p className="text-sm text-text-secondary mb-2">
                          Apply the entropy-to-position formula and confirm the displayed 
                          symbols match the calculated positions.
                        </p>
                        <div className="font-mono text-xs text-green-400 bg-gray-900 p-2 rounded">
                          position = BigInt(&quot;0x&quot; + entropy) % BigInt(num_symbols)
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-xl p-8 text-center border border-purple-500/30">
                <h3 className="text-2xl font-bold text-white mb-4">Try It Yourself</h3>
                <p className="text-text-secondary mb-6">
                  Use our verification tool to check any spin from our games.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/verify" className="btn-primary">
                    Verify a Spin
                  </Link>
                  <Link href="/kiro-demo" className="btn-secondary">
                    Play Demo
                  </Link>
                </div>
              </div>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-text-secondary mb-4">
              Have questions about our provably fair system?
            </p>
            <Link href="/provably-fair" className="text-purple-400 hover:text-purple-300">
              Read the detailed technical documentation →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
