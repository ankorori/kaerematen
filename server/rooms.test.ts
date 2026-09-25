import { beforeEach, describe, expect, it } from "vitest";
import type { Server, Socket } from "socket.io";
import { RoomManager } from "./rooms";
import { NIGHT_CATEGORIES } from "../lib/nightQuestions";
import { QUIZ_QUESTIONS } from "../lib/quizQuestions";
import type { ClientToServerEvents, RoomState, ServerToClientEvents } from "../lib/types";

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function createFakeIo() {
  const states = new Map<string, RoomState>();
  const io = {
    to: (room: string) => ({
      emit: (_event: "state", state: RoomState) => {
        states.set(room, state);
      },
    }),
  } as unknown as Server<ClientToServerEvents, ServerToClientEvents>;
  return { io, states };
}

function createFakeSocket(id: string): AppSocket {
  return {
    id,
    data: {},
    join: () => {},
    emit: () => {},
  } as unknown as AppSocket;
}

function join(manager: RoomManager, socket: AppSocket, roomId: string, nickname: string, hostToken?: string) {
  let result: { ok: true; playerId: string; isHost: boolean } | { ok: false; message: string } | undefined;
  manager.handleJoin(socket, { roomId, nickname, hostToken }, (res) => {
    result = res;
  });
  if (!result?.ok) throw new Error("join failed in test setup");
  return result;
}

describe("RoomManager - streak mode (一致するまで終われまテン)", () => {
  let manager: RoomManager;
  let states: Map<string, RoomState>;
  let roomId: string;
  let hostToken: string;
  let host: AppSocket;
  let guest: AppSocket;

  beforeEach(() => {
    const fake = createFakeIo();
    manager = new RoomManager(fake.io);
    states = fake.states;

    const created = manager.createRoom();
    roomId = created.roomId;
    hostToken = created.hostToken;

    host = createFakeSocket("host-socket");
    guest = createFakeSocket("guest-socket");
    join(manager, host, roomId, "ホスト", hostToken);
    join(manager, guest, roomId, "ゲスト");
  });

  function currentState(): RoomState {
    const state = states.get(roomId);
    if (!state) throw new Error("room state missing");
    return state;
  }

  it("defaults new rooms to streak mode", () => {
    expect(currentState().settings.mode).toBe("streak");
  });

  it("increments the streak when every player's normalized answer matches", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "  ﾎﾞﾀﾝ  " });
    manager.handleSubmit(guest, { text: "ボタン" });

    const state = currentState();
    expect(state.phase).toBe("reveal");
    expect(state.lastResult).toEqual({ matched: true, forced: false, milestone: false });
    expect(state.streak).toBe(1);
  });

  it("resets the streak to 0 when answers don't match", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "犬" });
    manager.handleSubmit(guest, { text: "猫" });

    const state = currentState();
    expect(state.lastResult?.matched).toBe(false);
    expect(state.streak).toBe(0);
  });

  it("lets the host force a match after a mismatch", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "犬" });
    manager.handleSubmit(guest, { text: "猫" });

    manager.handleForceMatch(host);

    const state = currentState();
    expect(state.lastResult).toEqual({ matched: true, forced: true, milestone: false });
    expect(state.streak).toBe(1);
  });

  it("ignores force_match from a non-host player", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "犬" });
    manager.handleSubmit(guest, { text: "猫" });

    manager.handleForceMatch(guest);

    expect(currentState().streak).toBe(0);
  });

  function playMismatchedRounds(count: number): string[] {
    const asked: string[] = [];
    for (let i = 0; i < count; i++) {
      if (currentState().phase === "reveal") manager.handleAdvance(host);
      asked.push(currentState().currentQuestion!);
      manager.handleSubmit(host, { text: "犬" });
      manager.handleSubmit(guest, { text: "猫" });
    }
    return asked;
  }

  it("does not repeat a question until every question in the pool has been asked", () => {
    manager.handleUpdateSettings(host, { categoryIds: ["http-status"] });
    manager.handleStart(host);
    const poolSize = currentState().totalQuestions;

    const asked = playMismatchedRounds(poolSize);
    expect(new Set(asked).size).toBe(poolSize);

    // 一巡した後も直前と同じ問題は続かない
    const next = playMismatchedRounds(1);
    expect(next[0]).not.toBe(asked[asked.length - 1]);
  });

  it("prefers questions not yet asked in this room after a restart", () => {
    manager.handleUpdateSettings(host, { categoryIds: ["http-status"] });
    manager.handleStart(host);
    const firstGame = playMismatchedRounds(3);

    manager.handleRestart(host);
    manager.handleStart(host);
    const secondGame = playMismatchedRounds(3);

    expect(secondGame.filter((q) => firstGame.includes(q))).toEqual([]);
  });

  it("clears the room after reaching the goal streak", () => {
    manager.handleStart(host);
    for (let i = 0; i < 10; i++) {
      manager.handleSubmit(host, { text: "いっしょ" });
      manager.handleSubmit(guest, { text: "いっしょ" });
      const state = currentState();
      if (state.phase === "cleared") break;
      manager.handleAdvance(host);
    }

    const state = currentState();
    expect(state.phase).toBe("cleared");
    expect(state.streak).toBeGreaterThanOrEqual(state.goal);
  });
});

describe("RoomManager - quiz mode (クイズモード)", () => {
  let manager: RoomManager;
  let states: Map<string, RoomState>;
  let roomId: string;
  let hostToken: string;
  let host: AppSocket;
  let guest: AppSocket;

  beforeEach(() => {
    const fake = createFakeIo();
    manager = new RoomManager(fake.io);
    states = fake.states;

    const created = manager.createRoom();
    roomId = created.roomId;
    hostToken = created.hostToken;

    host = createFakeSocket("host-socket");
    guest = createFakeSocket("guest-socket");
    join(manager, host, roomId, "ホスト", hostToken);
    join(manager, guest, roomId, "ゲスト");

    manager.handleUpdateSettings(host, { mode: "quiz", quizChapterIds: ["wit"] });
  });

  function currentState(): RoomState {
    const state = states.get(roomId);
    if (!state) throw new Error("room state missing");
    return state;
  }

  it("switches the room into quiz mode and exposes the selected chapter", () => {
    const state = currentState();
    expect(state.settings.mode).toBe("quiz");
    expect(state.settings.quizChapterIds).toEqual(["wit"]);
  });

  it("builds a question pool limited to the selected chapter", () => {
    manager.handleStart(host);
    expect(currentState().totalQuestions).toBe(20);
    expect(currentState().phase).toBe("answering");
  });

  it("scores correct and incorrect answers independently per player", () => {
    manager.handleStart(host);
    const questionText = currentState().currentQuestion;
    const question = QUIZ_QUESTIONS.find((q) => q.question === questionText);
    expect(question).toBeTruthy();

    manager.handleSubmit(host, { text: question!.answer });
    manager.handleSubmit(guest, { text: "ぜんぜん違う答え" });

    const state = currentState();
    expect(state.phase).toBe("reveal");
    const hostPlayer = state.players.find((p) => p.id === "host-socket")!;
    const guestPlayer = state.players.find((p) => p.id === "guest-socket")!;
    expect(hostPlayer.isCorrect).toBe(true);
    expect(hostPlayer.score).toBe(1);
    expect(guestPlayer.isCorrect).toBe(false);
    expect(guestPlayer.score).toBe(0);
    expect(state.correctAnswerText).toBe(question!.answer);
  });

  it("lets the host manually toggle a player's correctness and adjust their score", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "全然違う" });
    manager.handleSubmit(guest, { text: "全然違う" });

    expect(currentState().players.find((p) => p.id === "host-socket")?.score).toBe(0);

    manager.handleToggleCorrect(host, { playerId: "host-socket" });

    const state = currentState();
    const hostPlayer = state.players.find((p) => p.id === "host-socket")!;
    expect(hostPlayer.isCorrect).toBe(true);
    expect(hostPlayer.score).toBe(1);

    // toggling again reverts the score
    manager.handleToggleCorrect(host, { playerId: "host-socket" });
    expect(currentState().players.find((p) => p.id === "host-socket")?.score).toBe(0);
  });

  it("ignores force_match in quiz mode (streak-only action)", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "違う" });
    manager.handleSubmit(guest, { text: "違う" });

    manager.handleForceMatch(host);

    expect(currentState().streak).toBe(0);
    expect(currentState().phase).toBe("reveal");
  });

  it("moves to the cleared phase with a ranking after the last question", () => {
    manager.handleStart(host);

    for (let i = 0; i < 20; i++) {
      manager.handleSubmit(host, { text: "correct-ish" });
      manager.handleSubmit(guest, { text: "correct-ish" });
      const state = currentState();
      if (state.phase === "cleared") break;
      manager.handleAdvance(host);
    }

    const state = currentState();
    expect(state.phase).toBe("cleared");
    expect(state.questionNumber).toBe(20);
  });

  it("never repeats a question within a game and prefers unasked ones after a restart", () => {
    manager.handleStart(host);
    const firstGame: string[] = [];
    for (let i = 0; i < 10; i++) {
      if (i > 0) manager.handleAdvance(host);
      firstGame.push(currentState().currentQuestion!);
      manager.handleSubmit(host, { text: "x" });
      manager.handleSubmit(guest, { text: "x" });
    }
    expect(new Set(firstGame).size).toBe(10);

    manager.handleRestart(host);
    manager.handleStart(host);
    const secondGame: string[] = [];
    for (let i = 0; i < 10; i++) {
      if (i > 0) manager.handleAdvance(host);
      secondGame.push(currentState().currentQuestion!);
      manager.handleSubmit(host, { text: "x" });
      manager.handleSubmit(guest, { text: "x" });
    }
    expect(secondGame.filter((q) => firstGame.includes(q))).toEqual([]);
  });

  it("keeps per-question answers hidden from other players until reveal", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "回答" });

    const state = currentState();
    expect(state.phase).toBe("answering");
    const hostPlayer = state.players.find((p) => p.id === "host-socket")!;
    expect(hostPlayer.hasAnswered).toBe(true);
    expect(hostPlayer.answer).toBeNull();
    expect(hostPlayer.isCorrect).toBeNull();
  });
});

describe("RoomManager - night mode (深夜モード)", () => {
  let manager: RoomManager;
  let states: Map<string, RoomState>;
  let roomId: string;
  let host: AppSocket;
  let guest: AppSocket;

  beforeEach(() => {
    const fake = createFakeIo();
    manager = new RoomManager(fake.io);
    states = fake.states;

    const created = manager.createRoom();
    roomId = created.roomId;

    host = createFakeSocket("host-socket");
    guest = createFakeSocket("guest-socket");
    join(manager, host, roomId, "ホスト", created.hostToken);
    join(manager, guest, roomId, "ゲスト");

    manager.handleUpdateSettings(host, { mode: "night", nightCategoryIds: ["night-love"] });
  });

  function currentState(): RoomState {
    const state = states.get(roomId);
    if (!state) throw new Error("room state missing");
    return state;
  }

  it("asks only questions from the selected night categories", () => {
    const loveQuestions = NIGHT_CATEGORIES.find((c) => c.id === "night-love")!.questions;
    manager.handleStart(host);
    expect(currentState().totalQuestions).toBe(loveQuestions.length);
    expect(loveQuestions).toContain(currentState().currentQuestion);
  });

  it("plays like streak mode: matching answers extend the streak and host can force a match", () => {
    manager.handleStart(host);
    manager.handleSubmit(host, { text: "海" });
    manager.handleSubmit(guest, { text: "うみ" });
    expect(currentState().streak).toBe(0);

    manager.handleForceMatch(host);
    expect(currentState().streak).toBe(1);

    manager.handleAdvance(host);
    manager.handleSubmit(host, { text: "海" });
    manager.handleSubmit(guest, { text: "海" });
    expect(currentState().lastResult?.matched).toBe(true);
    expect(currentState().streak).toBe(2);
  });

  it("ignores unknown night category ids", () => {
    manager.handleUpdateSettings(host, { nightCategoryIds: ["not-a-category"] });
    expect(currentState().settings.nightCategoryIds).toEqual(["night-love"]);
  });
});
