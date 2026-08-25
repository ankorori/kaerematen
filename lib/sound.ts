"use client";

type AudioContextCtor = typeof AudioContext;

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor: AudioContextCtor | undefined =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

// 音声再生にはユーザー操作が必要なブラウザがあるため、ボタン操作などのタイミングで呼んでおく。
export function unlockAudio() {
  const c = getContext();
  if (c && c.state === "suspended") {
    c.resume().catch(() => {});
  }
}

function tone(
  c: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType,
  peakGain: number,
) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const start = c.currentTime + startOffset;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(peakGain, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

export function playMatchSound(milestone = false) {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  const notes = milestone ? [523.25, 659.25, 783.99, 1046.5] : [523.25, 659.25, 783.99];
  notes.forEach((freq, i) => tone(c, freq, i * 0.12, 0.35, "triangle", milestone ? 0.26 : 0.2));
}

export function playMismatchSound() {
  const c = getContext();
  if (!c) return;
  if (c.state === "suspended") c.resume().catch(() => {});
  tone(c, 220, 0, 0.25, "sawtooth", 0.18);
  tone(c, 164.81, 0.18, 0.35, "sawtooth", 0.18);
}
