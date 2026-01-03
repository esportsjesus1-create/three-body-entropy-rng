/**
 * Script to generate golden vector reference outputs.
 * 
 * Run this script to regenerate the reference-outputs.json file.
 * This should only be done when the physics engine changes intentionally.
 * 
 * Usage: npx ts-node generate-reference-outputs.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ThreeBodySimulation,
  createFigure8Configuration,
  createLagrangeConfiguration,
  calculateTotalEnergy
} from '../../modules/physics-engine/src';
import type { Vector3D, SimulationState } from '../../modules/shared-types/src';

interface ScenarioInput {
  masses: [number, number, number];
  positions: [Vector3D, Vector3D, Vector3D];
  velocities: [Vector3D, Vector3D, Vector3D];
  duration: number;
  timeStep: number;
  energyDrift: number;
}

interface Scenario {
  name: string;
  description: string;
  input: ScenarioInput;
  output: SimulationState;
}

interface ReferenceOutputs {
  metadata: {
    generatedAt: string;
    generatorVersion: string;
    description: string;
  };
  scenario1: Scenario;
  scenario2: Scenario;
  scenario3: Scenario;
  scenario4: Scenario;
  scenario5: Scenario;
}

function generateScenario1(): Scenario {
  const sim = new ThreeBodySimulation();
  const initialConditions = createFigure8Configuration();
  
  sim.initializeSystem(
    initialConditions.masses,
    initialConditions.positions,
    initialConditions.velocities
  );
  
  const initialEnergy = sim.getTotalEnergy();
  const duration = 1.0;
  const timeStep = 0.001;
  
  const finalState = sim.simulateForTime(duration, timeStep);
  const energyDrift = (finalState.totalEnergy - initialEnergy) / Math.abs(initialEnergy);
  
  return {
    name: 'Figure-8 Orbit Configuration',
    description: 'Classic figure-8 periodic orbit with equal masses',
    input: {
      masses: initialConditions.masses,
      positions: initialConditions.positions,
      velocities: initialConditions.velocities,
      duration,
      timeStep,
      energyDrift
    },
    output: finalState
  };
}

function generateScenario2(): Scenario {
  const sim = new ThreeBodySimulation();
  const initialConditions = createLagrangeConfiguration();
  
  sim.initializeSystem(
    initialConditions.masses,
    initialConditions.positions,
    initialConditions.velocities
  );
  
  const initialEnergy = sim.getTotalEnergy();
  const duration = 2.0;
  const timeStep = 0.001;
  
  const finalState = sim.simulateForTime(duration, timeStep);
  const energyDrift = (finalState.totalEnergy - initialEnergy) / Math.abs(initialEnergy);
  
  return {
    name: 'Lagrange Equilateral Triangle Configuration',
    description: 'Lagrange equilateral triangle with equal masses',
    input: {
      masses: initialConditions.masses,
      positions: initialConditions.positions,
      velocities: initialConditions.velocities,
      duration,
      timeStep,
      energyDrift
    },
    output: finalState
  };
}

function generateScenario3(): Scenario {
  const sim = new ThreeBodySimulation();
  
  // Custom asymmetric configuration
  const masses: [number, number, number] = [1.5, 1.0, 0.5];
  const positions: [Vector3D, Vector3D, Vector3D] = [
    { x: -2.0, y: 0.0, z: 0.0 },
    { x: 1.0, y: 1.732, z: 0.0 },
    { x: 1.0, y: -1.732, z: 0.0 }
  ];
  const velocities: [Vector3D, Vector3D, Vector3D] = [
    { x: 0.0, y: 0.5, z: 0.0 },
    { x: -0.433, y: -0.25, z: 0.0 },
    { x: 0.433, y: -0.25, z: 0.0 }
  ];
  
  sim.initializeSystem(masses, positions, velocities);
  
  const initialEnergy = sim.getTotalEnergy();
  const duration = 0.5;
  const timeStep = 0.001;
  
  const finalState = sim.simulateForTime(duration, timeStep);
  const energyDrift = (finalState.totalEnergy - initialEnergy) / Math.abs(initialEnergy);
  
  return {
    name: 'Custom Asymmetric Configuration',
    description: 'Asymmetric masses in triangular arrangement',
    input: {
      masses,
      positions,
      velocities,
      duration,
      timeStep,
      energyDrift
    },
    output: finalState
  };
}

function generateScenario4(): Scenario {
  const sim = new ThreeBodySimulation();
  
  // High-precision short duration test
  const masses: [number, number, number] = [1.0, 1.0, 1.0];
  const positions: [Vector3D, Vector3D, Vector3D] = [
    { x: 0.97000436, y: -0.24308753, z: 0.0 },
    { x: -0.97000436, y: 0.24308753, z: 0.0 },
    { x: 0.0, y: 0.0, z: 0.0 }
  ];
  const velocities: [Vector3D, Vector3D, Vector3D] = [
    { x: 0.466203685, y: 0.43236573, z: 0.0 },
    { x: 0.466203685, y: 0.43236573, z: 0.0 },
    { x: -0.93240737, y: -0.86473146, z: 0.0 }
  ];
  
  sim.initializeSystem(masses, positions, velocities);
  
  const initialEnergy = sim.getTotalEnergy();
  const duration = 0.1;
  const timeStep = 0.0001; // Higher precision
  
  const finalState = sim.simulateForTime(duration, timeStep);
  const energyDrift = (finalState.totalEnergy - initialEnergy) / Math.abs(initialEnergy);
  
  return {
    name: 'High-Precision Short Duration',
    description: 'Short simulation with very small time step for precision testing',
    input: {
      masses,
      positions,
      velocities,
      duration,
      timeStep,
      energyDrift
    },
    output: finalState
  };
}

function generateScenario5(): Scenario {
  const sim = new ThreeBodySimulation();
  
  // Long duration chaotic evolution
  const masses: [number, number, number] = [1.2, 0.8, 1.0];
  const positions: [Vector3D, Vector3D, Vector3D] = [
    { x: -1.5, y: 0.5, z: 0.1 },
    { x: 1.5, y: -0.5, z: -0.1 },
    { x: 0.0, y: 0.0, z: 0.0 }
  ];
  const velocities: [Vector3D, Vector3D, Vector3D] = [
    { x: 0.2, y: 0.3, z: 0.05 },
    { x: -0.2, y: -0.3, z: -0.05 },
    { x: 0.0, y: 0.0, z: 0.0 }
  ];
  
  sim.initializeSystem(masses, positions, velocities);
  
  const initialEnergy = sim.getTotalEnergy();
  const duration = 5.0;
  const timeStep = 0.001;
  
  const finalState = sim.simulateForTime(duration, timeStep);
  const energyDrift = (finalState.totalEnergy - initialEnergy) / Math.abs(initialEnergy);
  
  return {
    name: 'Long Duration Chaotic Evolution',
    description: 'Extended simulation to test chaotic behavior and numerical stability',
    input: {
      masses,
      positions,
      velocities,
      duration,
      timeStep,
      energyDrift
    },
    output: finalState
  };
}

function main(): void {
  console.log('Generating golden vector reference outputs...\n');
  
  const referenceOutputs: ReferenceOutputs = {
    metadata: {
      generatedAt: new Date().toISOString(),
      generatorVersion: '1.0.0',
      description: 'Golden vector reference outputs for cross-platform determinism testing'
    },
    scenario1: generateScenario1(),
    scenario2: generateScenario2(),
    scenario3: generateScenario3(),
    scenario4: generateScenario4(),
    scenario5: generateScenario5()
  };
  
  // Print summary
  console.log('Generated scenarios:');
  for (const [key, scenario] of Object.entries(referenceOutputs)) {
    if (key === 'metadata') continue;
    const s = scenario as Scenario;
    console.log(`  ${key}: ${s.name}`);
    console.log(`    Duration: ${s.input.duration}s, TimeStep: ${s.input.timeStep}s`);
    console.log(`    Energy drift: ${(s.input.energyDrift * 100).toFixed(6)}%`);
    console.log(`    Final step count: ${s.output.stepCount}`);
  }
  
  // Write to file
  const outputPath = path.join(__dirname, 'fixtures', 'reference-outputs.json');
  fs.writeFileSync(outputPath, JSON.stringify(referenceOutputs, null, 2));
  
  console.log(`\nReference outputs written to: ${outputPath}`);
}

main();
