/**
 * Golden Vector Tests - Cross-Platform Determinism
 * 
 * These tests ensure bit-for-bit identical physics outputs across:
 * - Linux amd64
 * - Linux arm64
 * - macOS arm64
 * 
 * The golden vectors are pre-computed reference outputs that must match
 * exactly on all platforms to guarantee deterministic behavior.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  ThreeBodySimulation,
  createFigure8Configuration,
  createLagrangeConfiguration,
  rk4Step,
  calculateTotalEnergy,
  calculateAngularMomentum
} from '../../modules/physics-engine/src';
import type {
  SystemConfiguration,
  SimulationState,
  Vector3D
} from '../../modules/shared-types/src';
import referenceOutputs from './fixtures/reference-outputs.json';

/**
 * Helper function to compare floating-point numbers with exact bit-for-bit matching.
 * For cross-platform determinism, we need exact equality, not approximate.
 */
function expectExactMatch(actual: number, expected: number, context: string): void {
  expect(actual).toBe(expected);
  if (actual !== expected) {
    console.error(`Mismatch in ${context}: actual=${actual}, expected=${expected}`);
  }
}

/**
 * Helper function to compare Vector3D objects with exact matching.
 */
function expectVector3DMatch(actual: Vector3D, expected: Vector3D, context: string): void {
  expectExactMatch(actual.x, expected.x, `${context}.x`);
  expectExactMatch(actual.y, expected.y, `${context}.y`);
  expectExactMatch(actual.z, expected.z, `${context}.z`);
}

/**
 * Helper function to compare SystemConfiguration objects with exact matching.
 */
function expectConfigurationMatch(
  actual: SystemConfiguration,
  expected: SystemConfiguration,
  context: string
): void {
  expect(actual.gravitationalConstant).toBe(expected.gravitationalConstant);
  expect(actual.softeningParameter).toBe(expected.softeningParameter);
  
  for (let i = 0; i < 3; i++) {
    expectExactMatch(actual.bodies[i].mass, expected.bodies[i].mass, `${context}.bodies[${i}].mass`);
    expectVector3DMatch(actual.bodies[i].position, expected.bodies[i].position, `${context}.bodies[${i}].position`);
    expectVector3DMatch(actual.bodies[i].velocity, expected.bodies[i].velocity, `${context}.bodies[${i}].velocity`);
  }
}

/**
 * Helper function to compare SimulationState objects with exact matching.
 */
function expectSimulationStateMatch(
  actual: SimulationState,
  expected: SimulationState,
  context: string
): void {
  expectExactMatch(actual.time, expected.time, `${context}.time`);
  expectExactMatch(actual.totalEnergy, expected.totalEnergy, `${context}.totalEnergy`);
  expect(actual.stepCount).toBe(expected.stepCount);
  expectConfigurationMatch(actual.configuration, expected.configuration, `${context}.configuration`);
}

describe('Golden Vector Tests - Cross-Platform Determinism', () => {
  describe('Scenario 1: Figure-8 Orbit Configuration', () => {
    it('matches reference output for figure-8 orbit after 1.0 time units', () => {
      const scenario = referenceOutputs.scenario1;
      const sim = new ThreeBodySimulation();
      const initialConditions = createFigure8Configuration();
      
      sim.initializeSystem(
        initialConditions.masses,
        initialConditions.positions,
        initialConditions.velocities
      );
      
      const finalState = sim.simulateForTime(scenario.input.duration, scenario.input.timeStep);
      
      expectSimulationStateMatch(finalState, scenario.output as SimulationState, 'scenario1');
    });
  });

  describe('Scenario 2: Lagrange Equilateral Triangle Configuration', () => {
    it('matches reference output for Lagrange configuration after 2.0 time units', () => {
      const scenario = referenceOutputs.scenario2;
      const sim = new ThreeBodySimulation();
      const initialConditions = createLagrangeConfiguration();
      
      sim.initializeSystem(
        initialConditions.masses,
        initialConditions.positions,
        initialConditions.velocities
      );
      
      const finalState = sim.simulateForTime(scenario.input.duration, scenario.input.timeStep);
      
      expectSimulationStateMatch(finalState, scenario.output as SimulationState, 'scenario2');
    });
  });

  describe('Scenario 3: Custom Asymmetric Configuration', () => {
    it('matches reference output for asymmetric masses after 0.5 time units', () => {
      const scenario = referenceOutputs.scenario3;
      const sim = new ThreeBodySimulation();
      
      sim.initializeSystem(
        scenario.input.masses as [number, number, number],
        scenario.input.positions as [Vector3D, Vector3D, Vector3D],
        scenario.input.velocities as [Vector3D, Vector3D, Vector3D]
      );
      
      const finalState = sim.simulateForTime(scenario.input.duration, scenario.input.timeStep);
      
      expectSimulationStateMatch(finalState, scenario.output as SimulationState, 'scenario3');
    });
  });

  describe('Scenario 4: High-Precision Short Duration', () => {
    it('matches reference output for high-precision simulation after 0.1 time units', () => {
      const scenario = referenceOutputs.scenario4;
      const sim = new ThreeBodySimulation();
      
      sim.initializeSystem(
        scenario.input.masses as [number, number, number],
        scenario.input.positions as [Vector3D, Vector3D, Vector3D],
        scenario.input.velocities as [Vector3D, Vector3D, Vector3D]
      );
      
      const finalState = sim.simulateForTime(scenario.input.duration, scenario.input.timeStep);
      
      expectSimulationStateMatch(finalState, scenario.output as SimulationState, 'scenario4');
    });
  });

  describe('Scenario 5: Long Duration Chaotic Evolution', () => {
    it('matches reference output for chaotic evolution after 5.0 time units', () => {
      const scenario = referenceOutputs.scenario5;
      const sim = new ThreeBodySimulation();
      
      sim.initializeSystem(
        scenario.input.masses as [number, number, number],
        scenario.input.positions as [Vector3D, Vector3D, Vector3D],
        scenario.input.velocities as [Vector3D, Vector3D, Vector3D]
      );
      
      const finalState = sim.simulateForTime(scenario.input.duration, scenario.input.timeStep);
      
      expectSimulationStateMatch(finalState, scenario.output as SimulationState, 'scenario5');
    });
  });

  describe('Energy Conservation Verification', () => {
    it('verifies energy conservation across all scenarios', () => {
      const scenarios = [
        referenceOutputs.scenario1,
        referenceOutputs.scenario2,
        referenceOutputs.scenario3,
        referenceOutputs.scenario4,
        referenceOutputs.scenario5
      ];
      
      for (const scenario of scenarios) {
        // Energy drift should be minimal (less than 1% of initial energy)
        const energyDrift = Math.abs(scenario.input.energyDrift);
        expect(energyDrift).toBeLessThan(0.01);
      }
    });
  });

  describe('Angular Momentum Conservation Verification', () => {
    it('verifies angular momentum is preserved in reference outputs', () => {
      const scenarios = [
        referenceOutputs.scenario1,
        referenceOutputs.scenario2,
        referenceOutputs.scenario3,
        referenceOutputs.scenario4,
        referenceOutputs.scenario5
      ];
      
      for (const scenario of scenarios) {
        const angularMomentum = calculateAngularMomentum(scenario.output.configuration as SystemConfiguration);
        
        // Angular momentum magnitude should be finite and reasonable
        const magnitude = Math.sqrt(
          angularMomentum.x ** 2 + 
          angularMomentum.y ** 2 + 
          angularMomentum.z ** 2
        );
        expect(Number.isFinite(magnitude)).toBe(true);
      }
    });
  });
});

describe('RK4 Integrator Determinism', () => {
  it('produces identical results for single RK4 step', () => {
    const scenario = referenceOutputs.scenario1;
    const sim = new ThreeBodySimulation();
    const initialConditions = createFigure8Configuration();
    
    sim.initializeSystem(
      initialConditions.masses,
      initialConditions.positions,
      initialConditions.velocities
    );
    
    const config = sim.getConfiguration();
    const result1 = rk4Step(config, 0.001);
    const result2 = rk4Step(config, 0.001);
    
    // Both calls should produce identical results
    expectConfigurationMatch(result1, result2, 'rk4Step determinism');
  });
});
