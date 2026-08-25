"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/useSocket";
import type { RoomState } from "@/lib/types";
import { playMatchSound, playMismatchSound, unlockAudio } from "@/lib/sound";
import Confetti from "@/app/components/Confetti";
import Dismay from "@/app/components/Dismay";
import StreakBurst from "@/app/components/StreakBurst";

export default function DisplayPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params.roomId ?? "").toString().toUpperCase();

  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);
  const [soundOn, setSoundOn] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("watch", { roomId }, (res) => {
      if (!res.ok) setError(res.message ?? "ルームが見つかりません");
    });
    const onState = (s: RoomState) => setState(s);
    socket.on("state", onState);
    return () => {
      socket.off("state", onState);
    };
  }, [roomId]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!soundOn) return;
    if (state?.phase !== "reveal" || !state.lastResult) return;
    if (state.lastResult.matched) {
      playMatchSound(state.lastResult.milestone);
    } else {
      playMismatchSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn, state?.phase, state?.questionNumber]);

  const prevPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (soundOn && state?.phase === "cleared" && prevPhaseRef.current !== "cleared") {
      playMatchSound(true);
    }
    prevPhaseRef.current = state?.phase;
  }, [soundOn, state?.phase]);

  function enableSound() {
    unlockAudio();
    setSoundOn(true);
  }

  if (error) {
    return (
      <main className="container display">
        <p className="error">{error}</p>
      </main>
    );
  }

  if (!state) {
    return (
      <main className="container display">
        <p>読み込み中...</p>
      </main>
    );
  }

  const secondsLeft = state.answerDeadline && now > 0
    ? Math.max(0, Math.ceil((state.answerDeadline - now) / 1000))
    : null;
  const joinUrl = typeof window !== "undefined" ? `${window.location.origin}/play/${state.roomId}` : "";
  const selectedCategoryLabels = state.availableCategories
    .filter((c) => state.settings.categoryIds.includes(c.id))
    .map((c) => c.label);

  return (
    <main className="container display">
      <header className="statusbar big">
        <span>ルーム: {state.roomId}</span>
        <span>
          連続一致: {state.streak} / {state.goal}
        </span>
        <button type="button" className="secondary sound-toggle" onClick={enableSound}>
          {soundOn ? "🔊 音声ON" : "🔈 音声を有効にする"}
        </button>
      </header>

      {state.phase === "lobby" && (
        <section>
          <h1>参加者を待っています</h1>
          <p className="joinurl">参加用URL: {joinUrl}</p>
          <p className="hint center">
            回答時間: {state.settings.answerDurationMs / 1000}秒 / カテゴリ: {selectedCategoryLabels.join("、")}
          </p>
          <ul className="playergrid">
            {state.players.map((p) => (
              <li key={p.id}>{p.nickname}</li>
            ))}
          </ul>
        </section>
      )}

      {state.phase === "answering" && (
        <section>
          <h1>{state.currentQuestion}</h1>
          {secondsLeft !== null && <p className="timer big">残り {secondsLeft} 秒</p>}
          <ul className="playergrid">
            {state.players.map((p) => (
              <li key={p.id} className={p.hasAnswered ? "answered" : ""}>
                {p.nickname}
                {p.hasAnswered ? " ✓" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      {state.phase === "reveal" && (
        <section>
          {state.lastResult?.matched ? (
            <Confetti key={state.questionNumber} />
          ) : (
            <Dismay key={state.questionNumber} />
          )}
          {state.lastResult?.matched && state.lastResult.milestone && (
            <StreakBurst key={`streak-${state.questionNumber}`} streak={state.streak} pieceCount={70} />
          )}
          <h1 className={state.lastResult?.matched ? "matched" : "mismatched"}>
            {state.lastResult?.matched ? "一致！" : "不一致…"}
          </h1>
          <ul className="playergrid">
            {state.players.map((p) => (
              <li key={p.id}>
                {p.nickname}: <strong>{p.answer ?? "(未回答)"}</strong>
              </li>
            ))}
          </ul>
          <p className="hint center">ホストが次の問題に進めるのを待っています…</p>
        </section>
      )}

      {state.phase === "cleared" && (
        <section>
          <Confetti pieceCount={220} />
          <h1 className="matched cleared-title">クリア！ 🎉 10回連続一致達成！</h1>
        </section>
      )}
    </main>
  );
}
