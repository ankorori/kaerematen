export interface QuestionCategory {
  id: string;
  label: string;
  questions: string[];
}

// QUESTIONS.md の叩き台に対応するお題リスト。カテゴリごとに出題を選べる。
export const QUESTION_CATEGORIES: QuestionCategory[] = [
  {
    id: "http-status",
    label: "HTTPステータスコード",
    questions: [
      "好きなHTTPステータスコードといえば？",
      "「見つかりません」を意味するステータスコードといえば？",
      "サーバー側のエラーを表す500番台のステータスコードといえば？",
      "認証エラーを表すステータスコードといえば？",
      "リダイレクトでよく見るステータスコードといえば？",
      "一番よく見る「正常終了」のステータスコードといえば？",
    ],
  },
  {
    id: "prog-lang",
    label: "プログラミング言語",
    questions: [
      "好きなプログラミング言語といえば？",
      "初めて学んだプログラミング言語といえば？",
      "プログラミング初心者がまず学ぶ言語といえば？",
      "「とりあえず動けばいい」で書かれがちな言語といえば？",
      "型に厳しい言語といえば？",
      "一番タイプ数が多いと感じる言語といえば？",
    ],
  },
  {
    id: "git",
    label: "Git用語・コマンド",
    questions: [
      "一番よく打つGitコマンドといえば？",
      "とりあえず打ってしまうコミットメッセージといえば？",
      "Gitでやらかしやすいミスといえば？",
      "ブランチ名によく使う単語といえば？",
      "コンフリクトが起きた時に叫びたくなる一言といえば？",
    ],
  },
  {
    id: "shortcut",
    label: "キーボードショートカット",
    questions: [
      "一番よく使うショートカットキーといえば？",
      "コピー&ペーストのショートカットキーといえば？",
      "元に戻す(undo)のショートカットキーといえば？",
      "全画面検索・置換のショートカットキーといえば？",
    ],
  },
  {
    id: "company-oss",
    label: "有名企業・OSS・人物",
    questions: [
      "ITエンジニアなら誰でも知ってる有名企業といえば？",
      "よくお世話になっているOSS(オープンソースソフトウェア)といえば？",
      "有名なプログラミング言語の生みの親といえば？",
      "クラウドサービスの三大巨頭といえば？",
    ],
  },
  {
    id: "bug-error",
    label: "あるあるバグ・エラーメッセージ",
    questions: [
      "よく見るエラーメッセージといえば？",
      "原因不明のバグが起きたときにまず疑うものといえば？",
      "「動かない」と言われて最初に聞くことといえば？",
      "締め切り前によく起きることといえば？",
    ],
  },
  {
    id: "editor-tool",
    label: "エディタ・ツール",
    questions: [
      "好きなエディタ/IDEといえば？",
      "ターミナルで一番よく使うコマンドといえば？",
      "タスク管理でよく使うツールといえば？",
      "オンライン会議でよく使うツールといえば？",
    ],
  },
  {
    id: "db-infra",
    label: "データベース・インフラ",
    questions: [
      "よく使うデータベースといえば？",
      "コンテナ技術といえば？",
      "CI/CDでよく聞く単語といえば？",
    ],
  },
];

export const ALL_CATEGORY_IDS = QUESTION_CATEGORIES.map((c) => c.id);

export function getQuestionsForCategories(categoryIds: string[]): string[] {
  const ids = categoryIds.length > 0 ? categoryIds : ALL_CATEGORY_IDS;
  const set = new Set(ids);
  return QUESTION_CATEGORIES.filter((c) => set.has(c.id)).flatMap((c) => c.questions);
}
