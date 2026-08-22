export type Phase = "lobby" | "answering" | "reveal" | "cleared";

export interface PublicPlayer {
  id: string;
  nickname: string;
  hasAnswered: boolean;
  answer: string | null;
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
  answerDeadline: number | null;
  lastResult: { matched: boolean; forced: boolean } | null;
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
  start_game: () => void;
  submit_answer: (payload: { text: string }) => void;
  force_match: () => void;
  advance: () => void;
  restart_game: () => void;
}

export interface ServerToClientEvents {
  state: (state: RoomState) => void;
}
