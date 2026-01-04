"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface ThreeBodySimulationProps {
  width?: number;
  height?: number;
  showTrails?: boolean;
  perturbation?: number;
  label?: string;
  onThetaUpdate?: (theta: number) => void;
}

const G = 1;
const DT = 0.002;
const SOFTENING = 0.1;
const TRAIL_LENGTH = 100;

function getInitialBodies(perturbation: number = 0): Body[] {
  return [
    {
      x: 0.97000436 + perturbation,
      y: -0.24308753,
      vx: 0.466203685,
      vy: 0.43236573,
      mass: 1,
      color: "#f472b6",
      trail: [],
    },
    {
      x: -0.97000436,
      y: 0.24308753,
      vx: 0.466203685,
      vy: 0.43236573,
      mass: 1,
      color: "#60a5fa",
      trail: [],
    },
    {
      x: 0,
      y: 0,
      vx: -0.93240737,
      vy: -0.86473146,
      mass: 1,
      color: "#4ade80",
      trail: [],
    },
  ];
}

function computeAcceleration(bodies: Body[], index: number): { ax: number; ay: number } {
  let ax = 0;
  let ay = 0;
  const body = bodies[index];

  for (let i = 0; i < bodies.length; i++) {
    if (i === index) continue;
    const other = bodies[i];
    const dx = other.x - body.x;
    const dy = other.y - body.y;
    const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
    const dist = Math.sqrt(distSq);
    const force = (G * other.mass) / distSq;
    ax += force * (dx / dist);
    ay += force * (dy / dist);
  }

  return { ax, ay };
}

function rk4Step(bodies: Body[]): Body[] {
  const newBodies: Body[] = bodies.map((b) => ({ ...b, trail: [...b.trail] }));

  for (let i = 0; i < bodies.length; i++) {
    const b = bodies[i];
    
    const k1 = computeAcceleration(bodies, i);
    const k1vx = b.vx;
    const k1vy = b.vy;

    const tempBodies1 = bodies.map((body, idx) => ({
      ...body,
      x: idx === i ? body.x + k1vx * DT / 2 : body.x,
      y: idx === i ? body.y + k1vy * DT / 2 : body.y,
      vx: idx === i ? body.vx + k1.ax * DT / 2 : body.vx,
      vy: idx === i ? body.vy + k1.ay * DT / 2 : body.vy,
    }));
    const k2 = computeAcceleration(tempBodies1, i);
    const k2vx = b.vx + k1.ax * DT / 2;
    const k2vy = b.vy + k1.ay * DT / 2;

    const tempBodies2 = bodies.map((body, idx) => ({
      ...body,
      x: idx === i ? body.x + k2vx * DT / 2 : body.x,
      y: idx === i ? body.y + k2vy * DT / 2 : body.y,
      vx: idx === i ? body.vx + k2.ax * DT / 2 : body.vx,
      vy: idx === i ? body.vy + k2.ay * DT / 2 : body.vy,
    }));
    const k3 = computeAcceleration(tempBodies2, i);
    const k3vx = b.vx + k2.ax * DT / 2;
    const k3vy = b.vy + k2.ay * DT / 2;

    const tempBodies3 = bodies.map((body, idx) => ({
      ...body,
      x: idx === i ? body.x + k3vx * DT : body.x,
      y: idx === i ? body.y + k3vy * DT : body.y,
      vx: idx === i ? body.vx + k3.ax * DT : body.vx,
      vy: idx === i ? body.vy + k3.ay * DT : body.vy,
    }));
    const k4 = computeAcceleration(tempBodies3, i);
    const k4vx = b.vx + k3.ax * DT;
    const k4vy = b.vy + k3.ay * DT;

    newBodies[i].vx = b.vx + (k1.ax + 2 * k2.ax + 2 * k3.ax + k4.ax) * DT / 6;
    newBodies[i].vy = b.vy + (k1.ay + 2 * k2.ay + 2 * k3.ay + k4.ay) * DT / 6;
    newBodies[i].x = b.x + (k1vx + 2 * k2vx + 2 * k3vx + k4vx) * DT / 6;
    newBodies[i].y = b.y + (k1vy + 2 * k2vy + 2 * k3vy + k4vy) * DT / 6;

    newBodies[i].trail.push({ x: newBodies[i].x, y: newBodies[i].y });
    if (newBodies[i].trail.length > TRAIL_LENGTH) {
      newBodies[i].trail.shift();
    }
  }

  return newBodies;
}

function computeTheta(bodies: Body[]): number {
  const b0 = bodies[0];
  const b1 = bodies[1];
  const dx = b1.x - b0.x;
  const dy = b1.y - b0.y;
  return Math.atan2(dy, dx);
}

export default function ThreeBodySimulation({
  width = 200,
  height = 200,
  showTrails = true,
  perturbation = 0,
  label,
  onThetaUpdate,
}: ThreeBodySimulationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bodiesRef = useRef<Body[]>(getInitialBodies(perturbation));
  const animationRef = useRef<number>();
  const [isRunning, setIsRunning] = useState(true);

  const draw = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    const scale = width / 5;
    const centerX = width / 2;
    const centerY = height / 2;

    const bodies = bodiesRef.current;

    if (showTrails) {
      bodies.forEach((body) => {
        if (body.trail.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = body.color + "40";
        ctx.lineWidth = 1;
        for (let i = 0; i < body.trail.length; i++) {
          const point = body.trail[i];
          const x = centerX + point.x * scale;
          const y = centerY + point.y * scale;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      });
    }

    bodies.forEach((body) => {
      const x = centerX + body.x * scale;
      const y = centerY + body.y * scale;
      
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = body.color;
      ctx.fill();
      
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = body.color + "60";
      ctx.lineWidth = 2;
      ctx.stroke();
    });
  }, [width, height, showTrails]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastTime = 0;
    const stepsPerFrame = 5;

    const animate = (time: number) => {
      if (!isRunning) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      if (time - lastTime > 16) {
        for (let i = 0; i < stepsPerFrame; i++) {
          bodiesRef.current = rk4Step(bodiesRef.current);
        }
        
        if (onThetaUpdate) {
          onThetaUpdate(computeTheta(bodiesRef.current));
        }
        
        draw(ctx);
        lastTime = time;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, isRunning, onThetaUpdate]);

  const handleReset = () => {
    bodiesRef.current = getInitialBodies(perturbation);
  };

  return (
    <div className="flex flex-col items-center">
      {label && (
        <div className="text-sm text-text-secondary mb-2">{label}</div>
      )}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="rounded-lg border border-gray-700"
      />
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => setIsRunning(!isRunning)}
          className="px-3 py-1 text-xs bg-purple-600/20 text-purple-400 rounded hover:bg-purple-600/30 transition"
        >
          {isRunning ? "Pause" : "Play"}
        </button>
        <button
          onClick={handleReset}
          className="px-3 py-1 text-xs bg-gray-600/20 text-gray-400 rounded hover:bg-gray-600/30 transition"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
