"use client";

import { useMemo } from "react";

const EMOJIS = ["🔥", "⭐", "✨", "🎇"];

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export default function StreakBurst({ streak, pieceCount = 40 }: { streak: number; pieceCount?: number }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: pieceCount }, (_, i) => ({
        id: i,
        left: randomBetween(0, 100),
        delay: randomBetween(0, 0.4),
        duration: randomBetween(1.4, 2.4),
        size: randomBetween(20, 38),
        emoji: EMOJIS[i % EMOJIS.length],
      })),
    [pieceCount],
  );

  return (
    <div className="streak-layer" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="streak-piece"
          style={{
            left: `${p.left}%`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            fontSize: `${p.size}px`,
          }}
        >
          {p.emoji}
        </span>
      ))}
      <div className="streak-banner">{streak}連続一致！🔥</div>
    </div>
  );
}
