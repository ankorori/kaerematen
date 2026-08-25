// ゲーム全体で共有する設定値・デフォルト値。
export const GOAL = 10;

// 連続一致がこの倍数に達するたびに特別演出を出す。
export const MILESTONE_INTERVAL = 3;

export const DEFAULT_ANSWER_DURATION_SEC = 90;
export const MIN_ANSWER_DURATION_SEC = 15;
export const MAX_ANSWER_DURATION_SEC = 180;

// ホストが選べる回答時間(秒)の候補。
export const ANSWER_DURATION_CHOICES_SEC = [30, 45, 60, 90, 120, 150] as const;
