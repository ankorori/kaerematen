"use client";

import { useMemo } from "react";

const COLORS = ["#ff3d81", "#6c4bff", "#ffb703", "#1fb87a", "#38bdf8", "#ff8a5b"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Confetti({ pieceCount = 100 }: { pieceCount?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: randomBetween(0, 100),
        delay: randomBetween(0, 0.5),
        duration: randomBetween(2.2, 3.8),
        rotate: randomBetween(0, 360),
        color: COLORS[i % COLORS.length],
        width: randomBetween(6, 12),
        height: randomBetween(10, 18),
        drift: randomBetween(-80, 80),
      })),
    [pieceCount],
  );

  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={
            {
              left: `${p.left}%`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              backgroundColor: p.color,
              width: `${p.width}px`,
              height: `${p.height}px`,
              "--confetti-drift": `${p.drift}px`,
              "--confetti-rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
