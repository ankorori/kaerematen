export type Phase = "lobby" | "answering" | "reveal" | "cleared";

export type GameMode = "streak" | "quiz" | "night";

export interface PublicPlayer {
  id: string;
  nickname: string;
  hasAnswered: boolean;
  answer: string | null;
  score: number;
  isCorrect: boolean | null;
}

export interface QuestionCategoryInfo {
  id: string;
  label: string;
}

export interface RoomSettings {
  answerDurationMs: number;
  categoryIds: string[];
  mode: GameMode;
  quizChapterIds: string[];
  nightCategoryIds: string[];
}

export interface RoomState {
  roomId: string;
  phase: Phase;
  players: PublicPlayer[];
  hostPlayerId: string | null;
  streak: number;
  goal: number;
  questionNumber: number;
  totalQuestions: number;
  currentQuestion: string | null;
  correctAnswerText: string | null;
  answerDeadline: number | null;
  lastResult: { matched: boolean; forced: boolean; milestone: boolean } | null;
  settings: RoomSettings;
  availableCategories: QuestionCategoryInfo[];
  availableQuizChapters: QuestionCategoryInfo[];
  availableNightCategories: QuestionCategoryInfo[];
}

export type JoinResult =
  | { ok: true; playerId: string; isHost: boolean }
  | { ok: false; message: string };

export type WatchResult = { ok: true } | { ok: false; message: string };

export interface ClientToServerEvents {
  create_room: (ack: (res: { roomId: string; hostToken: string }) => void) => void;
  join: (
    payload: { roomId: string; nickname: string; hostToken?: string },
    ack: (res: JoinResult) => void,
  ) => void;
  watch: (payload: { roomId: string }, ack: (res: WatchResult) => void) => void;
  update_settings: (payload: {
    answerDurationSec?: number;
    categoryIds?: string[];
    mode?: GameMode;
    quizChapterIds?: string[];
    nightCategoryIds?: string[];
  }) => void;
  start_game: () => void;
  submit_answer: (payload: { text: string }) => void;
  force_match: () => void;
  toggle_correct: (payload: { playerId: string }) => void;
  advance: () => void;
  restart_game: () => void;
}

export interface ServerToClientEvents {
  state: (state: RoomState) => void;
}
