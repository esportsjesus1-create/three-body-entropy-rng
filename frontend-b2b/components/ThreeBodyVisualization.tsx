"use client";

import { useEffect, useRef, useState } from "react";

interface Body {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  color: string;
  trail: { x: number; y: number }[];
}

interface ThreeBodyVisualizationProps {
  isAnimating: boolean;
  size?: number;
  showTrails?: boolean;
}

export default function ThreeBodyVisualization({
  isAnimating,
  size = 200,
  showTrails = true,
}: ThreeBodyVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const bodiesRef = useRef<Body[]>([]);
  const [entropy, setEntropy] = useState<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const centerX = size / 2;
    const centerY = size / 2;
    const scale = size / 5;

    const initializeBodies = () => {
      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = angle1 + (Math.PI * 2) / 3;
      const angle3 = angle1 + (Math.PI * 4) / 3;
      const radius = 1.2;

      bodiesRef.current = [
        {
          x: Math.cos(angle1) * radius,
          y: Math.sin(angle1) * radius,
          vx: -Math.sin(angle1) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle1) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#fa1625",
          trail: [],
        },
        {
          x: Math.cos(angle2) * radius,
          y: Math.sin(angle2) * radius,
          vx: -Math.sin(angle2) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle2) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#ff8b1a",
          trail: [],
        },
        {
          x: Math.cos(angle3) * radius,
          y: Math.sin(angle3) * radius,
          vx: -Math.sin(angle3) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle3) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#1d7000",
          trail: [],
        },
      ];
    };

    const G = 1.0;
    const dt = 0.016;
    const softening = 0.1;

    const updatePhysics = () => {
      const bodies = bodiesRef.current;

      for (let i = 0; i < bodies.length; i++) {
        let ax = 0;
        let ay = 0;

        for (let j = 0; j < bodies.length; j++) {
          if (i === j) continue;

          const dx = bodies[j].x - bodies[i].x;
          const dy = bodies[j].y - bodies[i].y;
          const distSq = dx * dx + dy * dy + softening * softening;
          const dist = Math.sqrt(distSq);
          const force = (G * bodies[j].mass) / distSq;

          ax += force * (dx / dist);
          ay += force * (dy / dist);
        }

        bodies[i].vx += ax * dt;
        bodies[i].vy += ay * dt;
      }

      for (const body of bodies) {
        body.x += body.vx * dt;
        body.y += body.vy * dt;

        if (showTrails) {
          body.trail.push({ x: body.x, y: body.y });
          if (body.trail.length > 50) {
            body.trail.shift();
          }
        }
      }

      const entropyValue =
        Math.abs(bodies[0].x * bodies[1].y - bodies[0].y * bodies[1].x) +
        Math.abs(bodies[1].x * bodies[2].y - bodies[1].y * bodies[2].x) +
        Math.abs(bodies[2].x * bodies[0].y - bodies[2].y * bodies[0].x);
      setEntropy(entropyValue.toFixed(6));
    };

    const render = () => {
      ctx.fillStyle = "rgba(26, 22, 37, 0.3)";
      ctx.fillRect(0, 0, size, size);

      const bodies = bodiesRef.current;

      if (showTrails) {
        for (const body of bodies) {
          if (body.trail.length < 2) continue;

          ctx.beginPath();
          ctx.moveTo(
            centerX + body.trail[0].x * scale,
            centerY + body.trail[0].y * scale
          );

          for (let i = 1; i < body.trail.length; i++) {
            ctx.lineTo(
              centerX + body.trail[i].x * scale,
              centerY + body.trail[i].y * scale
            );
          }

          ctx.strokeStyle = body.color + "60";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      for (const body of bodies) {
        const screenX = centerX + body.x * scale;
        const screenY = centerY + body.y * scale;

        const gradient = ctx.createRadialGradient(
          screenX,
          screenY,
          0,
          screenX,
          screenY,
          12
        );
        gradient.addColorStop(0, body.color);
        gradient.addColorStop(0.5, body.color + "80");
        gradient.addColorStop(1, "transparent");

        ctx.beginPath();
        ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
        ctx.fillStyle = body.color;
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(centerX, centerY, 3, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff40";
      ctx.fill();
    };

    const animate = () => {
      if (isAnimating) {
        updatePhysics();
      }
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    initializeBodies();

    ctx.fillStyle = "#1a1625";
    ctx.fillRect(0, 0, size, size);

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAnimating, size, showTrails]);

  useEffect(() => {
    if (isAnimating) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const angle1 = Math.random() * Math.PI * 2;
      const angle2 = angle1 + (Math.PI * 2) / 3;
      const angle3 = angle1 + (Math.PI * 4) / 3;
      const radius = 1.2;

      bodiesRef.current = [
        {
          x: Math.cos(angle1) * radius,
          y: Math.sin(angle1) * radius,
          vx: -Math.sin(angle1) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle1) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#fa1625",
          trail: [],
        },
        {
          x: Math.cos(angle2) * radius,
          y: Math.sin(angle2) * radius,
          vx: -Math.sin(angle2) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle2) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#ff8b1a",
          trail: [],
        },
        {
          x: Math.cos(angle3) * radius,
          y: Math.sin(angle3) * radius,
          vx: -Math.sin(angle3) * 0.4 + (Math.random() - 0.5) * 0.1,
          vy: Math.cos(angle3) * 0.4 + (Math.random() - 0.5) * 0.1,
          mass: 1.0,
          color: "#1d7000",
          trail: [],
        },
      ];
    }
  }, [isAnimating]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          className="rounded-lg border border-primary/20"
          aria-label="Three-body physics simulation visualization"
        />
        {isAnimating && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-secondary/10 animate-pulse rounded-lg" />
          </div>
        )}
      </div>
      {isAnimating && (
        <div className="text-xs text-text-secondary font-mono">
          Entropy: {entropy}
        </div>
      )}
    </div>
  );
}
