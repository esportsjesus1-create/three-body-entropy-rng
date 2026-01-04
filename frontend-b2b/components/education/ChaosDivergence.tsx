"use client";

import { useState, useEffect, useRef } from "react";
import ThreeBodySimulation from "./ThreeBodySimulation";

export default function ChaosDivergence() {
  const [theta1, setTheta1] = useState(0);
  const [theta2, setTheta2] = useState(0);
  const [divergence, setDivergence] = useState(0);
  const [maxDivergence, setMaxDivergence] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const diff = Math.abs(theta1 - theta2);
    const normalizedDiff = Math.min(diff, Math.PI * 2 - diff);
    setDivergence(normalizedDiff);
    setMaxDivergence((prev) => Math.max(prev, normalizedDiff));
  }, [theta1, theta2]);

  const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);

  return (
    <div className="bg-secondary-bg rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-4">
        Chaos in Action: The Butterfly Effect
      </h3>
      <p className="text-text-secondary mb-6">
        These two simulations start with nearly identical conditions. The only difference 
        is a tiny perturbation of 0.0001 in one body&apos;s position. Watch how quickly they diverge.
      </p>
      
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <ThreeBodySimulation
            width={220}
            height={220}
            perturbation={0}
            label="Simulation A (Original)"
            onThetaUpdate={setTheta1}
          />
        </div>
        <div className="flex flex-col items-center">
          <ThreeBodySimulation
            width={220}
            height={220}
            perturbation={0.0001}
            label="Simulation B (+0.0001 offset)"
            onThetaUpdate={setTheta2}
          />
        </div>
      </div>

      <div className="bg-primary-bg rounded-lg p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Time Elapsed:</span>
          <span className="font-mono text-white">{elapsedSeconds}s</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Current Divergence (theta):</span>
          <span className="font-mono text-yellow-400">{divergence.toFixed(4)} rad</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Max Divergence:</span>
          <span className="font-mono text-red-400">{maxDivergence.toFixed(4)} rad</span>
        </div>
        <div className="mt-3">
          <div className="text-xs text-text-secondary mb-1">Divergence Meter</div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
              style={{ width: `${Math.min(100, (divergence / Math.PI) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 p-4 bg-purple-900/20 rounded-lg border border-purple-500/30">
        <p className="text-sm text-text-secondary">
          <strong className="text-purple-400">Why this matters:</strong> This sensitivity 
          to initial conditions makes the three-body system fundamentally unpredictable. 
          Even with perfect knowledge of the starting state, tiny measurement errors 
          (smaller than atoms) would lead to completely different outcomes. This chaos 
          is what makes three-body physics ideal for generating random numbers.
        </p>
      </div>
    </div>
  );
}
