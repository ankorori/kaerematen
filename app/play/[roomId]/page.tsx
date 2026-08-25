"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { getSocket } from "@/lib/useSocket";
import type { RoomState } from "@/lib/types";
import { ANSWER_DURATION_CHOICES_SEC } from "@/lib/settings";
import { playMatchSound, playMismatchSound, unlockAudio } from "@/lib/sound";
import Confetti from "@/app/components/Confetti";
import Dismay from "@/app/components/Dismay";
import StreakBurst from "@/app/components/StreakBurst";

export default function PlayPage() {
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const hostToken = searchParams.get("host") ?? undefined;
  const roomId = (params.roomId ?? "").toString().toUpperCase();

  const [nickname, setNickname] = useState("");
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<RoomState | null>(null);
  const [answerText, setAnswerText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [seenQuestionNumber, setSeenQuestionNumber] = useState<number | undefined>(undefined);
  const [now, setNow] = useState(0);

  if (state?.questionNumber !== seenQuestionNumber) {
    setSeenQuestionNumber(state?.questionNumber);
    setSubmitted(false);
  }

  useEffect(() => {
    const socket = getSocket();
    const onState = (s: RoomState) => setState(s);
    socket.on("state", onState);
    return () => {
      socket.off("state", onState);
    };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (state?.phase !== "reveal" || !state.lastResult) return;
    if (state.lastResult.matched) {
      playMatchSound(state.lastResult.milestone);
    } else {
      playMismatchSound();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.phase, state?.questionNumber]);

  const prevPhaseRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (state?.phase === "cleared" && prevPhaseRef.current !== "cleared") {
      playMatchSound(true);
    }
    prevPhaseRef.current = state?.phase;
  }, [state?.phase]);

  function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (!nickname.trim() || joining) return;
    unlockAudio();
    setJoining(true);
    const socket = getSocket();
    socket.emit("join", { roomId, nickname: nickname.trim(), hostToken }, (res) => {
      setJoining(false);
      if (res.ok) {
        setJoined(true);
        setIsHost(res.isHost);
        setError(null);
      } else {
        setError(res.message);
      }
    });
  }

  function handleSubmitAnswer(e: FormEvent) {
    e.preventDefault();
    if (!answerText.trim() || submitted) return;
    unlockAudio();
    getSocket().emit("submit_answer", { text: answerText.trim() });
    setAnswerText("");
    setSubmitted(true);
  }

  function startGame() {
    unlockAudio();
    getSocket().emit("start_game");
  }
  function forceMatch() {
    unlockAudio();
    getSocket().emit("force_match");
  }
  function advance() {
    unlockAudio();
    getSocket().emit("advance");
  }
  function restartGame() {
    unlockAudio();
    getSocket().emit("restart_game");
  }
  function setDurationSec(sec: number) {
    getSocket().emit("update_settings", { answerDurationSec: sec });
  }
  function toggleCategory(id: string) {
    if (!state) return;
    const current = state.settings.categoryIds;
    const next = current.includes(id) ? current.filter((c) => c !== id) : [...current, id];
    if (next.length === 0) return;
    getSocket().emit("update_settings", { categoryIds: next });
  }

  if (!joined) {
    return (
      <main className="container">
        <h1>ルームに参加</h1>
        <p>
          ルームコード: <strong>{roomId}</strong>
        </p>
        {hostToken && <p className="badge" style={{ alignSelf: "flex-start" }}>ホストとして参加します</p>}
        <form onSubmit={handleJoin}>
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="ニックネーム"
            maxLength={20}
            autoFocus
          />
          <button type="submit" disabled={joining}>
            参加する
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }

  if (!state) {
    return (
      <main className="container">
        <p>読み込み中...</p>
      </main>
    );
  }

  const secondsLeft = state.answerDeadline && now > 0
    ? Math.max(0, Math.ceil((state.answerDeadline - now) / 1000))
    : null;
  const answeredCount = state.players.filter((p) => p.hasAnswered).length;

  return (
    <main className="container">
      <header className="statusbar">
        <span>連続一致: {state.streak} / {state.goal}</span>
        {isHost && <span className="badge">ホスト</span>}
      </header>

      {state.phase === "lobby" && (
        <section className="card">
          <h2>ロビー</h2>
          <p className="hint">参加者:</p>
          <ul>
            {state.players.map((p) => (
              <li key={p.id}>
                {p.nickname}
                {p.id === state.hostPlayerId ? "(ホスト)" : ""}
              </li>
            ))}
          </ul>

          {isHost ? (
            <>
              <div className="settings-panel">
                <div className="settings-group">
                  <span className="settings-label">回答時間</span>
                  <div className="duration-options">
                    {ANSWER_DURATION_CHOICES_SEC.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={`chip${state.settings.answerDurationMs === sec * 1000 ? " selected" : ""}`}
                        onClick={() => setDurationSec(sec)}
                      >
                        {sec}秒
                      </button>
                    ))}
                  </div>
                </div>
                <div className="settings-group">
                  <span className="settings-label">お題のカテゴリ</span>
                  <div className="category-options">
                    {state.availableCategories.map((c) => (
                      <label key={c.id}>
                        <input
                          type="checkbox"
                          checked={state.settings.categoryIds.includes(c.id)}
                          onChange={() => toggleCategory(c.id)}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={startGame}>ゲーム開始</button>
            </>
          ) : (
            <p className="hint">ホストの開始を待っています…</p>
          )}
        </section>
      )}

      {state.phase === "answering" && (
        <section>
          <h2>お題 {state.questionNumber}問目</h2>
          <p className="question">{state.currentQuestion}</p>
          {secondsLeft !== null && <p className="timer">残り {secondsLeft} 秒</p>}
          {!submitted ? (
            <form onSubmit={handleSubmitAnswer}>
              <input
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="回答を入力"
                maxLength={100}
                autoFocus
              />
              <button type="submit">回答する</button>
            </form>
          ) : (
            <p className="hint">
              回答済み。他の人を待っています…({answeredCount}/{state.players.length})
            </p>
          )}
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
            <StreakBurst key={`streak-${state.questionNumber}`} streak={state.streak} />
          )}
          <h2 className={state.lastResult?.matched ? undefined : "mismatch-heading"}>
            {state.lastResult?.matched ? "一致！" : "不一致…"}
          </h2>
          <ul>
            {state.players.map((p) => (
              <li key={p.id}>
                {p.nickname}: {p.answer ?? "(未回答)"}
              </li>
            ))}
          </ul>
          {isHost ? (
            <div className="revealActions">
              {!state.lastResult?.matched && (
                <button className="secondary" onClick={forceMatch}>
                  強制一致にする
                </button>
              )}
              <button onClick={advance}>次の問題へ進む</button>
            </div>
          ) : (
            <p className="hint">ホストが次に進めるのを待っています…</p>
          )}
        </section>
      )}

      {state.phase === "cleared" && (
        <section className="card">
          <Confetti pieceCount={220} />
          <h2>クリア！ 🎉</h2>
          <p>10回連続一致達成！</p>
          {isHost && <button onClick={restartGame}>もう一度あそぶ</button>}
        </section>
      )}
    </main>
  );
}
