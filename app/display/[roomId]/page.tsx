"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSocket } from "@/lib/useSocket";
import type { RoomState } from "@/lib/types";

export default function DisplayPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = (params.roomId ?? "").toString().toUpperCase();

  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(0);

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

  return (
    <main className="container display">
      <header className="statusbar big">
        <span>ルーム: {state.roomId}</span>
        <span>
          連続一致: {state.streak} / {state.goal}
        </span>
      </header>

      {state.phase === "lobby" && (
        <section>
          <h1>参加者を待っています</h1>
          <p className="joinurl">参加用URL: {joinUrl}</p>
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
          <h1 className="matched cleared-title">クリア！ 🎉 10回連続一致達成！</h1>
        </section>
      )}
    </main>
  );
}
