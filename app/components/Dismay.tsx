"use client";

import { useMemo } from "react";

const DROPS = ["💧", "😢", "☔"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function Dismay({ pieceCount = 24 }: { pieceCount?: number }) {
  const drops = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: randomBetween(0, 100),
        delay: randomBetween(0, 0.7),
        duration: randomBetween(1.8, 3),
        size: randomBetween(14, 26),
        emoji: DROPS[i % DROPS.length],
      })),
    [pieceCount],
  );

  return (
    <div className="dismay-layer" aria-hidden="true">
      {drops.map((d) => (
        <span
          key={d.id}
          className="dismay-drop"
          style={{
            left: `${d.left}%`,
            animationDelay: `${d.delay}s`,
            animationDuration: `${d.duration}s`,
            fontSize: `${d.size}px`,
          }}
        >
          {d.emoji}
        </span>
      ))}
    </div>
  );
}
