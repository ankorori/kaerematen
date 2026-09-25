import { customAlphabet, nanoid } from "nanoid";
import type { Server, Socket } from "socket.io";
import { ALL_NIGHT_CATEGORY_IDS, NIGHT_CATEGORIES, getNightQuestionsForCategories } from "../lib/nightQuestions";
import { normalizeAnswer } from "../lib/normalize";
import { ALL_CATEGORY_IDS, QUESTION_CATEGORIES, getQuestionsForCategories } from "../lib/questions";
import {
  ALL_QUIZ_CHAPTER_IDS,
  QUIZ_CHAPTERS,
  getQuizQuestionsForChapters,
  isQuizAnswerCorrect,
  type QuizQuestion,
} from "../lib/quizQuestions";
import {
  DEFAULT_ANSWER_DURATION_SEC,
  DEFAULT_MODE,
  GOAL,
  MAX_ANSWER_DURATION_SEC,
  MILESTONE_INTERVAL,
  MIN_ANSWER_DURATION_SEC,
} from "../lib/settings";
import type {
  ClientToServerEvents,
  GameMode,
  JoinResult,
  RoomSettings,
  RoomState,
  ServerToClientEvents,
  WatchResult,
} from "../lib/types";

const roomCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

type Phase = "lobby" | "answering" | "reveal" | "cleared";

interface PlayerInternal {
  id: string;
  nickname: string;
  answer: string | null;
  score: number;
  isCorrect: boolean | null;
}

interface Room {
  id: string;
  hostToken: string;
  hostPlayerId: string | null;
  players: Map<string, PlayerInternal>;
  phase: Phase;
  streak: number;
  questionIndex: number;
  questionPool: string[];
  quizPool: QuizQuestion[];
  // このルームで一度出題した問題文。再スタートしてもリセットせず、未出題の問題を優先して出す。
  askedQuestions: Set<string>;
  attemptsCount: number;
  answerDeadline: number | null;
  lastResult: { matched: boolean; forced: boolean; milestone: boolean } | null;
  answerTimer: ReturnType<typeof setTimeout> | null;
  settings: RoomSettings;
}

type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

function shuffled<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// 未出題の問題をシャッフルして先頭に並べ、出題済みの問題はその後ろに回す。
function unaskedFirst<T>(items: T[], asked: Set<string>, textOf: (item: T) => string): T[] {
  const unasked = items.filter((item) => !asked.has(textOf(item)));
  const alreadyAsked = items.filter((item) => asked.has(textOf(item)));
  return [...shuffled(unasked), ...shuffled(alreadyAsked)];
}

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
      questionPool: [],
      quizPool: [],
      askedQuestions: new Set(),
      attemptsCount: 0,
      answerDeadline: null,
      lastResult: null,
      answerTimer: null,
      settings: {
        answerDurationMs: DEFAULT_ANSWER_DURATION_SEC * 1000,
        categoryIds: [...ALL_CATEGORY_IDS],
        mode: DEFAULT_MODE,
        quizChapterIds: [...ALL_QUIZ_CHAPTER_IDS],
        nightCategoryIds: [...ALL_NIGHT_CATEGORY_IDS],
      },
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
    room.players.set(id, { id, nickname, answer: null, score: 0, isCorrect: null });

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

  handleUpdateSettings(
    socket: AppSocket,
    payload: {
      answerDurationSec?: number;
      categoryIds?: string[];
      mode?: GameMode;
      quizChapterIds?: string[];
      nightCategoryIds?: string[];
    },
  ) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "lobby") return;

    if (typeof payload.answerDurationSec === "number") {
      const sec = Math.round(payload.answerDurationSec);
      if (sec >= MIN_ANSWER_DURATION_SEC && sec <= MAX_ANSWER_DURATION_SEC) {
        room.settings.answerDurationMs = sec * 1000;
      }
    }

    if (Array.isArray(payload.categoryIds)) {
      const valid = [...new Set(payload.categoryIds.filter((id) => ALL_CATEGORY_IDS.includes(id)))];
      if (valid.length > 0) {
        room.settings.categoryIds = valid;
      }
    }

    if (payload.mode === "streak" || payload.mode === "quiz" || payload.mode === "night") {
      room.settings.mode = payload.mode;
    }

    if (Array.isArray(payload.quizChapterIds)) {
      const valid = [...new Set(payload.quizChapterIds.filter((id) => ALL_QUIZ_CHAPTER_IDS.includes(id)))];
      if (valid.length > 0) {
        room.settings.quizChapterIds = valid;
      }
    }

    if (Array.isArray(payload.nightCategoryIds)) {
      const valid = [...new Set(payload.nightCategoryIds.filter((id) => ALL_NIGHT_CATEGORY_IDS.includes(id)))];
      if (valid.length > 0) {
        room.settings.nightCategoryIds = valid;
      }
    }

    this.broadcast(room);
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
    for (const p of room.players.values()) {
      p.score = 0;
      p.isCorrect = null;
    }

    if (room.settings.mode === "quiz") {
      room.quizPool = unaskedFirst(
        getQuizQuestionsForChapters(room.settings.quizChapterIds),
        room.askedQuestions,
        (q) => q.question,
      );
      room.questionPool = [];
    } else {
      const questions =
        room.settings.mode === "night"
          ? getNightQuestionsForCategories(room.settings.nightCategoryIds)
          : getQuestionsForCategories(room.settings.categoryIds);
      room.questionPool = unaskedFirst(
        questions,
        room.askedQuestions,
        (q) => q,
      );
      room.quizPool = [];
    }

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
    if (room.settings.mode === "quiz") return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "reveal") return;
    if (room.lastResult?.matched) return;

    const newStreak = room.streak + 1;
    const milestone = newStreak % MILESTONE_INTERVAL === 0 && newStreak < GOAL;
    room.streak = newStreak;
    room.lastResult = { matched: true, forced: true, milestone };
    this.checkClear(room);
    this.broadcast(room);
  }

  handleToggleCorrect(socket: AppSocket, payload: { playerId: string }) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (room.settings.mode !== "quiz") return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "reveal") return;

    const player = room.players.get(payload.playerId);
    if (!player) return;

    const wasCorrect = player.isCorrect === true;
    player.isCorrect = !wasCorrect;
    player.score += wasCorrect ? -1 : 1;
    this.broadcast(room);
  }

  handleAdvance(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;
    if (room.phase !== "reveal") return;

    if (room.settings.mode === "quiz" && room.questionIndex + 1 >= room.quizPool.length) {
      room.phase = "cleared";
      this.broadcast(room);
      return;
    }

    this.nextQuestion(room);
  }

  handleRestart(socket: AppSocket) {
    const room = this.roomOf(socket);
    if (!room) return;
    if (socket.data.playerId !== room.hostPlayerId) return;

    if (room.answerTimer) clearTimeout(room.answerTimer);

    room.phase = "lobby";
    room.streak = 0;
    room.questionIndex = -1;
    room.questionPool = [];
    room.quizPool = [];
    room.attemptsCount = 0;
    room.lastResult = null;
    room.answerDeadline = null;
    for (const p of room.players.values()) {
      p.answer = null;
      p.score = 0;
      p.isCorrect = null;
    }

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
      this.rooms.delete(room.id);
      return;
    }

    this.broadcast(room);
  }

  private nextQuestion(room: Room) {
    if (room.answerTimer) clearTimeout(room.answerTimer);

    room.questionIndex += 1;
    if (room.settings.mode !== "quiz" && room.questionIndex >= room.questionPool.length) {
      // 全問出し切ったら山札を作り直す。直前の問題が連続しないようにする。
      const last = room.questionPool[room.questionPool.length - 1];
      room.questionPool = shuffled(room.questionPool);
      if (room.questionPool.length > 1 && room.questionPool[0] === last) {
        [room.questionPool[0], room.questionPool[1]] = [room.questionPool[1], room.questionPool[0]];
      }
      room.questionIndex = 0;
    }
    const questionText =
      room.settings.mode === "quiz"
        ? room.quizPool[room.questionIndex]?.question
        : room.questionPool[room.questionIndex];
    if (questionText !== undefined) room.askedQuestions.add(questionText);
    room.attemptsCount += 1;
    for (const p of room.players.values()) {
      p.answer = null;
      p.isCorrect = null;
    }

    room.phase = "answering";
    room.lastResult = null;
    const duration = room.settings.answerDurationMs;
    room.answerDeadline = Date.now() + duration;
    room.answerTimer = setTimeout(() => this.revealNow(room), duration);

    this.broadcast(room);
  }

  private revealNow(room: Room) {
    if (room.phase !== "answering") return;
    room.answerTimer = null;
    room.phase = "reveal";

    if (room.settings.mode === "quiz") {
      this.revealQuiz(room);
    } else {
      this.revealStreak(room);
    }

    this.checkClear(room);
    this.broadcast(room);
  }

  private revealStreak(room: Room) {
    const players = [...room.players.values()];
    const normalized = players.map((p) => (p.answer ? normalizeAnswer(p.answer) : null));
    const matched =
      players.length > 0 &&
      normalized.every((n) => n !== null && n !== "") &&
      normalized.every((n) => n === normalized[0]);

    const newStreak = matched ? room.streak + 1 : 0;
    const milestone = matched && newStreak % MILESTONE_INTERVAL === 0 && newStreak < GOAL;
    room.streak = newStreak;
    room.lastResult = { matched, forced: false, milestone };
  }

  private revealQuiz(room: Room) {
    const question = room.quizPool[room.questionIndex];
    room.lastResult = null;
    if (!question) return;

    for (const player of room.players.values()) {
      const correct = player.answer !== null && isQuizAnswerCorrect(player.answer, question);
      player.isCorrect = correct;
      if (correct) player.score += 1;
    }
  }

  private checkClear(room: Room) {
    if (room.settings.mode !== "quiz" && room.streak >= GOAL) {
      room.phase = "cleared";
    }
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
    const currentQuizQuestion = room.settings.mode === "quiz" ? room.quizPool[room.questionIndex] : undefined;
    const poolLength = room.settings.mode === "quiz" ? room.quizPool.length : room.questionPool.length;
    const currentQuestionText =
      room.settings.mode === "quiz" ? currentQuizQuestion?.question ?? null : room.questionIndex >= 0 ? room.questionPool[room.questionIndex] : null;

    return {
      roomId: room.id,
      phase: room.phase,
      players: [...room.players.values()].map((p) => ({
        id: p.id,
        nickname: p.nickname,
        hasAnswered: p.answer !== null,
        answer: revealing ? p.answer : null,
        score: p.score,
        isCorrect: revealing ? p.isCorrect : null,
      })),
      hostPlayerId: room.hostPlayerId,
      streak: room.streak,
      goal: GOAL,
      questionNumber: room.attemptsCount,
      totalQuestions: poolLength,
      currentQuestion: currentQuestionText,
      correctAnswerText: revealing && currentQuizQuestion ? currentQuizQuestion.answer : null,
      answerDeadline: room.answerDeadline,
      lastResult: room.lastResult,
      settings: room.settings,
      availableCategories: QUESTION_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
      availableQuizChapters: QUIZ_CHAPTERS.map((c) => ({ id: c.id, label: c.label })),
      availableNightCategories: NIGHT_CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
    };
  }
}
