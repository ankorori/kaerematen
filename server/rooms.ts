import { customAlphabet, nanoid } from "nanoid";
import type { Server, Socket } from "socket.io";
import { normalizeAnswer } from "../lib/normalize";
import { QUESTIONS } from "../lib/questions";
import type {
  ClientToServerEvents,
  JoinResult,
  RoomState,
  ServerToClientEvents,
  WatchResult,
} from "../lib/types";

const ANSWER_DURATION_MS = 30_000;
const REVEAL_DURATION_MS = 5_000;
const GOAL = 10;

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

type Phase = "lobby" | "answering" | "reveal" | "cleared";

interface PlayerInternal {
  id: string;
  nickname: string;
  answer: string | null;
}

interface Room {
  id: string;
  hostToken: string;
  hostPlayerId: string | null;
  players: Map<string, PlayerInternal>;
  phase: Phase;
  streak: number;
  questionIndex: number;
  attemptsCount: number;
  answerDeadline: number | null;
  revealDeadline: number | null;
  lastResult: { matched: boolean; forced: boolean } | null;
  answerTimer: ReturnType<typeof setTimeout> | null;
  advanceTimer: ReturnType<typeof setTimeout> | null;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export class RoomManager {
  private rooms = new Map<string, Room>();

  constructor(private io: Server<ClientToServerEvents, ServerToClientEvents>) {}

  createRoom(): { roomId: string; hostToken: string } {
    let id = roomCode();
    while (this.rooms.has(id)) id = roomCode();

    const room: Room = {
      id,
      hostToken: nanoid(),
      hostPlayerId: null,
      players: new Map(),
      phase: "lobby",
      streak: 0,
      questionIndex: -1,
      attemptsCount: 0,
      answerDeadline: null,
      revealDeadline: null,
      lastResult: null,
      answerTimer: null,
      advanceTimer: null,
    };
    this.rooms.set(id, room);
    return { roomId: id, hostToken: room.hostToken };
  }

  handleJoin(
    socket: AppSocket,
    payload: { roomId: string; nickname: string; hostToken?: string },
    ack: (res: JoinResult) => void,
  ) {
    const roomId = (payload.roomId ?? "").trim().toUpperCase();
    const nickname = (payload.nickname ?? "").trim().slice(0, 20);
    const room = this.rooms.get(roomId);

    if (!room) {
      ack({ ok: false, message: "ルームが見つかりません" });
      return;
    }
    if (!nickname) {
      ack({ ok: false, message: "ニックネームを入力してください" });
      return;
    }

    const id = socket.id;
    room.players.set(id, { id, nickname, answer: null });

    let isHost = room.hostPlayerId === id;
    if (payload.hostToken && payload.hostToken === room.hostToken) {
      room.hostPlayerId = id;
      isHost = true;
    }

    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.playerId = id;

    ack({ ok: true, playerId: id, isHost });
    this.broadcast(room);
  }

  handleWatch(socket: AppSocket, payload: { roomId: string }, ack: (res: WatchResult) => void) {
    const roomId = (payload.roomId ?? "").trim().toUpperCase();
    const room = this.rooms.get(roomId);
    if (!room) {
      ack({ ok: false, message: "ルームが見つかりません" });
      return;
    }
    socket.join(room.id);
    socket.data.roomId = room.id;
    socket.data.spectator = true;
    ack({ ok: true });
    socket.emit("state", this.toPublicState(room));
  }

  handleStart(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "lobby") return;
    if (room.players.size === 0) return;

    room.streak = 0;
    room.questionIndex = -1;
    room.attemptsCount = 0;
    this.nextQuestion(room);
  }

  handleSubmit(socket: AppSocket, payload: { text: string }) {
    const room = this.roomOf(socket);
    if (!room || room.phase !== "answering") return;
    const player = room.players.get(socket.data.playerId ?? "");
    if (!player) return;

    player.answer = String(payload.text ?? "").slice(0, 100);
    this.broadcast(room);

    const allAnswered = [...room.players.values()].every((p) => p.answer !== null);
    if (allAnswered) {
      if (room.answerTimer) clearTimeout(room.answerTimer);
      this.revealNow(room);
    }
  }

  handleForceMatch(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "reveal") return;
    if (room.lastResult?.matched) return;

    room.lastResult = { matched: true, forced: true };
    room.streak += 1;
    if (room.advanceTimer) clearTimeout(room.advanceTimer);
    this.scheduleAfterReveal(room);
    this.broadcast(room);
  }

  handleRestart(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;

    if (room.answerTimer) clearTimeout(room.answerTimer);
    if (room.advanceTimer) clearTimeout(room.advanceTimer);

    room.phase = "lobby";
    room.streak = 0;
    room.questionIndex = -1;
    room.attemptsCount = 0;
    room.lastResult = null;
    room.answerDeadline = null;
    room.revealDeadline = null;
    for (const p of room.players.values()) p.answer = null;

    this.broadcast(room);
  }

  handleDisconnect(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;

    if (!socket.data.spectator && socket.data.playerId) {
      room.players.delete(socket.data.playerId);

      if (room.phase === "answering") {
        const remaining = [...room.players.values()];
        if (remaining.length > 0 && remaining.every((p) => p.answer !== null)) {
          if (room.answerTimer) clearTimeout(room.answerTimer);
          this.revealNow(room);
        }
      }
    }

    if (room.players.size === 0) {
      if (room.answerTimer) clearTimeout(room.answerTimer);
      if (room.advanceTimer) clearTimeout(room.advanceTimer);
      this.rooms.delete(room.id);
      return;
    }

    this.broadcast(room);
  }

  private nextQuestion(room: Room) {
    if (room.answerTimer) clearTimeout(room.answerTimer);
    if (room.advanceTimer) clearTimeout(room.advanceTimer);

    room.questionIndex = (room.questionIndex + 1) % QUESTIONS.length;
    room.attemptsCount += 1;
    for (const p of room.players.values()) p.answer = null;

    room.phase = "answering";
    room.lastResult = null;
    room.answerDeadline = Date.now() + ANSWER_DURATION_MS;
    room.revealDeadline = null;
    room.answerTimer = setTimeout(() => this.revealNow(room), ANSWER_DURATION_MS);

    this.broadcast(room);
  }

  private revealNow(room: Room) {
    if (room.phase !== "answering") return;
    room.answerTimer = null;
    room.phase = "reveal";

    const players = [...room.players.values()];
    const normalized = players.map((p) => (p.answer ? normalizeAnswer(p.answer) : null));
    const matched =
      players.length > 0 &&
      normalized.every((n) => n !== null && n !== "") &&
      normalized.every((n) => n === normalized[0]);

    room.lastResult = { matched, forced: false };
    room.streak = matched ? room.streak + 1 : 0;

    this.scheduleAfterReveal(room);
    this.broadcast(room);
  }

  private scheduleAfterReveal(room: Room) {
    if (room.streak >= GOAL) {
      room.phase = "cleared";
      room.revealDeadline = null;
      return;
    }
    room.revealDeadline = Date.now() + REVEAL_DURATION_MS;
    room.advanceTimer = setTimeout(() => this.nextQuestion(room), REVEAL_DURATION_MS);
  }

  private roomOf(socket: AppSocket): Room | undefined {
    const roomId = socket.data.roomId;
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  private broadcast(room: Room) {
    this.io.to(room.id).emit("state", this.toPublicState(room));
  }

  private toPublicState(room: Room): RoomState {
    const revealing = room.phase === "reveal" || room.phase === "cleared";
    return {
      roomId: room.id,
      phase: room.phase,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        nickname: p.nickname,
        hasAnswered: p.answer !== null,
        answer: revealing ? p.answer : null,
      })),
      hostPlayerId: room.hostPlayerId,
      streak: room.streak,
      goal: GOAL,
      questionNumber: room.attemptsCount,
      totalQuestions: QUESTIONS.length,
      currentQuestion: room.questionIndex >= 0 ? QUESTIONS[room.questionIndex] : null,
      answerDeadline: room.answerDeadline,
      revealDeadline: room.revealDeadline,
      lastResult: room.lastResult,
    };
  }
}
