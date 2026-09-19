import { normalizeAnswer } from "./normalize";

export interface QuizQuestion {
  id: number;
  chapterId: string;
  question: string;
  answer: string;
  acceptableAnswers?: string[];
}

export interface QuizChapter {
  id: string;
  label: string;
}

export const QUIZ_CHAPTERS: QuizChapter[] = [
  { id: "wit", label: "第1章:ひらめき・なぞなぞ" },
  { id: "nature", label: "第2章:生き物・自然クイズ" },
  { id: "food", label: "第3章:食べ物・生活クイズ" },
  { id: "trivia", label: "第4章:日本と世界の雑学クイズ" },
  { id: "proverb", label: "第5章:言葉・ことわざ・○×クイズ" },
];

export const ALL_QUIZ_CHAPTER_IDS = QUIZ_CHAPTERS.map((c) => c.id);

const MARU_ALTS = ["まる", "マル", "o", "O", "0", "はい", "yes", "正しい"];
const BATSU_ALTS = ["ばつ", "バツ", "x", "X", "いいえ", "no", "間違い"];

// ○×クイズを簡潔に定義するためのヘルパー。
function trueFalse(id: number, chapterId: string, question: string, correct: "○" | "×"): QuizQuestion {
  return {
    id,
    chapterId,
    question,
    answer: correct,
    acceptableAnswers: correct === "○" ? MARU_ALTS : BATSU_ALTS,
  };
}

// 老若男女みんなで楽しめるクイズ(全100問、5章構成)。
export const QUIZ_QUESTIONS: QuizQuestion[] = [
  // 第1章: ひらめき・なぞなぞ (1-20)
  {
    id: 1,
    chapterId: "wit",
    question: "上に上がると小さくなって、下に下がると大きくなるものなーんだ？",
    answer: "飛行機",
    acceptableAnswers: ["鳥"],
  },
  {
    id: 2,
    chapterId: "wit",
    question: "飲むと胸がスカッとするのに、食べると怒られるパンなーんだ？",
    answer: "フライパン",
  },
  {
    id: 3,
    chapterId: "wit",
    question: "どんなに頼んでも、絶対にお金を払わせてくれないお店なーんだ？",
    answer: "ごちそう",
    acceptableAnswers: ["おごり", "奢り"],
  },
  {
    id: 4,
    chapterId: "wit",
    question: "部屋の中に4人の大人。急に雨が降ってきたが誰も濡れなかった。なぜ？",
    answer: "家の中にいるから",
    acceptableAnswers: ["室内にいるから", "家の中だから"],
  },
  {
    id: 5,
    chapterId: "wit",
    question: "叩くと音が出るのに、叩けば叩くほど静かになるものなーんだ？",
    answer: "肩",
    acceptableAnswers: ["肩たたき"],
  },
  {
    id: 6,
    chapterId: "wit",
    question: "1年で「30日」まである月は何回ある？",
    answer: "11回",
    acceptableAnswers: ["11"],
  },
  {
    id: 7,
    chapterId: "wit",
    question: "赤ちゃんカエルは何て鳴く？",
    answer: "鳴かない",
    acceptableAnswers: ["オタマジャクシだから", "オタマジャクシ"],
  },
  {
    id: 8,
    chapterId: "wit",
    question: "切っても切っても傷が残らないものなーんだ？",
    answer: "水",
    acceptableAnswers: ["空気", "カード"],
  },
  {
    id: 9,
    chapterId: "wit",
    question: "どんなに遠くへ行っても自分のすぐ後ろについてくるものなーんだ？",
    answer: "影",
  },
  {
    id: 10,
    chapterId: "wit",
    question: "武将の教えで有名な、束にすると折れないとされる矢の数は？",
    answer: "3本",
    acceptableAnswers: ["3"],
  },
  {
    id: 11,
    chapterId: "wit",
    question: "押し入れの奥に眠っている、固くて甘い「いも」なーんだ？",
    answer: "大学芋",
  },
  {
    id: 12,
    chapterId: "wit",
    question: "買ってきたときは黒、使うときは赤、捨てるときは灰色のものなーんだ？",
    answer: "炭",
  },
  {
    id: 13,
    chapterId: "wit",
    question: "押すと開いて、引くと閉まる、雨の日に使うものなーんだ？",
    answer: "傘",
  },
  {
    id: 14,
    chapterId: "wit",
    question: "飛ぶのが大嫌いでいつも水の中にいる鳥なーんだ？",
    answer: "ペンギン",
  },
  {
    id: 15,
    chapterId: "wit",
    question: "どんなに足が速い人でも絶対追い抜けないものなーんだ？",
    answer: "自分の影",
    acceptableAnswers: ["影", "前の人"],
  },
  {
    id: 16,
    chapterId: "wit",
    question: "バスに乗っている客全員が大人だが、誰も運賃を払わない。なぜ？",
    answer: "定期券を持っているから",
    acceptableAnswers: ["定期券", "運転手だから", "運転手"],
  },
  {
    id: 17,
    chapterId: "wit",
    question: "朝は4本足、昼は2本足、夜は3本足になるものなーんだ？",
    answer: "人間",
  },
  {
    id: 18,
    chapterId: "wit",
    question: "入れると大きくなり、出すと小さくなる、銭湯にあるものなーんだ？",
    answer: "お湯の量",
    acceptableAnswers: ["お湯"],
  },
  {
    id: 19,
    chapterId: "wit",
    question: "世界中で一番大きなお皿なーんだ？",
    answer: "南米大陸",
    acceptableAnswers: ["大陸", "南米"],
  },
  {
    id: 20,
    chapterId: "wit",
    question: "壊れれば壊れるほどみんなが喜んで拍手するものなーんだ？",
    answer: "記録",
  },

  // 第2章: 生き物・自然クイズ (21-40)
  { id: 21, chapterId: "nature", question: "キリンの首の骨の数は？", answer: "7本", acceptableAnswers: ["7"] },
  {
    id: 22,
    chapterId: "nature",
    question: "カンガルーのお腹の袋の中にあるものは？",
    answer: "おっぱい",
    acceptableAnswers: ["乳首"],
  },
  { id: 23, chapterId: "nature", question: "クマは冬眠中に排泄をする？しない？", answer: "しない", acceptableAnswers: ["一切しない"] },
  { id: 24, chapterId: "nature", question: "カメの甲羅はどこの骨が変化したもの？", answer: "あばら骨", acceptableAnswers: ["肋骨"] },
  {
    id: 25,
    chapterId: "nature",
    question: "アリが列をなして歩けるのはなぜ？",
    answer: "におい",
    acceptableAnswers: ["フェロモン"],
  },
  {
    id: 26,
    chapterId: "nature",
    question: "トンボの目(複眼)はおよそ何個？",
    answer: "1万〜3万個",
    acceptableAnswers: ["約1万〜3万個", "1万個", "3万個", "1万", "3万"],
  },
  {
    id: 27,
    chapterId: "nature",
    question: "ラッコが流されないように体にくくりつけるものは？",
    answer: "昆布",
    acceptableAnswers: ["海藻"],
  },
  {
    id: 28,
    chapterId: "nature",
    question: "世界で一番背が高い木は何メートルを超える？",
    answer: "100メートル以上",
    acceptableAnswers: ["100m以上", "100メートル", "100m"],
  },
  { id: 29, chapterId: "nature", question: "イカの足は何本？", answer: "10本", acceptableAnswers: ["10"] },
  { id: 30, chapterId: "nature", question: "太陽系の中で一番大きな惑星は？", answer: "木星" },
  { id: 31, chapterId: "nature", question: "猫がリラックスしている時に喉から出す音は？", answer: "ゴロゴロ" },
  { id: 32, chapterId: "nature", question: "イルカは魚類？哺乳類？", answer: "哺乳類" },
  {
    id: 33,
    chapterId: "nature",
    question: "フラミンゴがピンク色をしているのはなぜ？",
    answer: "エビやミジンコを食べたから",
    acceptableAnswers: ["エビを食べたから", "ミジンコを食べたから", "食べ物の色素"],
  },
  { id: 34, chapterId: "nature", question: "植物が光を浴びて酸素を作る働きを何という？", answer: "光合成" },
  {
    id: 35,
    chapterId: "nature",
    question: "カタツムリの歯はおよそ何本？",
    answer: "1万本以上",
    acceptableAnswers: ["10000本以上", "1万本", "10000本"],
  },
  { id: 36, chapterId: "nature", question: "ゾウの長い鼻にある骨の数は？", answer: "0本", acceptableAnswers: ["ない", "なし", "0"] },
  { id: 37, chapterId: "nature", question: "アサガオの花が咲く時間帯は？", answer: "早朝" },
  { id: 38, chapterId: "nature", question: "コアラが主食にしている葉っぱは？", answer: "ユーカリ" },
  {
    id: 39,
    chapterId: "nature",
    question: "ホタルが光る目的は？",
    answer: "仲間探し",
    acceptableAnswers: ["求愛", "コミュニケーション"],
  },
  { id: 40, chapterId: "nature", question: "南極にいる代表的な鳥は？", answer: "ペンギン" },

  // 第3章: 食べ物・生活クイズ (41-60)
  { id: 41, chapterId: "food", question: "カレーにチョコを入れるタイミングは？", answer: "火を止めてから" },
  {
    id: 42,
    chapterId: "food",
    question: "おにぎりとおむすびで、形に明確な違いがあるとされるのはどちら？",
    answer: "おむすび",
    acceptableAnswers: ["山型"],
  },
  {
    id: 43,
    chapterId: "food",
    question: "納豆がねばねばする理由となる成分は？",
    answer: "アミノ酸",
    acceptableAnswers: ["ポリグルタミン酸"],
  },
  { id: 44, chapterId: "food", question: "西洋料理でスープを飲む際のスプーンの動かし方は？", answer: "手前から奥へ" },
  { id: 45, chapterId: "food", question: "たくあんの名前の由来になったお坊さんは？", answer: "沢庵和尚", acceptableAnswers: ["沢庵"] },
  {
    id: 46,
    chapterId: "food",
    question: "関西風と関東風のうどんつゆで違うものは？",
    answer: "出汁と醤油",
    acceptableAnswers: ["出汁", "だし", "醤油"],
  },
  { id: 47, chapterId: "food", question: "豆腐作りに欠かせない固める液体は？", answer: "にがり" },
  { id: 48, chapterId: "food", question: "トマトは農林水産省の分類で野菜？果物？", answer: "野菜" },
  {
    id: 49,
    chapterId: "food",
    question: "マヨネーズの主な原料は？",
    answer: "卵、油、酢",
    acceptableAnswers: ["卵", "油", "酢", "卵・油・酢"],
  },
  { id: 50, chapterId: "food", question: "スパゲッティを茹でるときにお湯に塩を入れる理由は？", answer: "下味をつけるため", acceptableAnswers: ["下味"] },
  { id: 51, chapterId: "food", question: "水ようかんと普通のようかんで水分が多いのはどちら？", answer: "水ようかん" },
  { id: 52, chapterId: "food", question: "温泉卵を作るとき先に固まるのは黄身？白身？", answer: "黄身" },
  { id: 53, chapterId: "food", question: "日本で一番生産されているミカンの品種は？", answer: "温州ミカン", acceptableAnswers: ["温州みかん"] },
  { id: 54, chapterId: "food", question: "ホットケーキとパンケーキの一般的な違いは？", answer: "甘さの違い", acceptableAnswers: ["甘さ"] },
  { id: 55, chapterId: "food", question: "ほうれん草を茹でるとき先にお湯に入れる部分は？", answer: "根元" },
  { id: 56, chapterId: "food", question: "寿司屋の「ガリ」は何の甘酢漬け？", answer: "生姜", acceptableAnswers: ["しょうが"] },
  {
    id: 57,
    chapterId: "food",
    question: "食パンの「1斤」はおよそ何グラム以上？",
    answer: "340g以上",
    acceptableAnswers: ["340グラム以上", "340g", "340グラム"],
  },
  { id: 58, chapterId: "food", question: "氷を早く溶かすには塩？砂糖？", answer: "塩" },
  { id: 59, chapterId: "food", question: "天ぷらの衣をサクサクにするのに使う水は？", answer: "冷たい水", acceptableAnswers: ["氷水"] },
  { id: 60, chapterId: "food", question: "緑茶・ウーロン茶・紅茶の茶葉の種類は同じ？違う？", answer: "同じ" },

  // 第4章: 日本と世界の雑学クイズ (61-80)
  { id: 61, chapterId: "trivia", question: "日本で2番目に高い山は？", answer: "北岳" },
  { id: 62, chapterId: "trivia", question: "日本で一番面積が狭い都道府県は？", answer: "香川県", acceptableAnswers: ["香川"] },
  {
    id: 63,
    chapterId: "trivia",
    question: "世界で一番長い川は？",
    answer: "ナイル川",
    acceptableAnswers: ["アマゾン川"],
  },
  { id: 64, chapterId: "trivia", question: "3月3日の、女の子の成長を祝う行事は？", answer: "ひな祭り", acceptableAnswers: ["雛祭り"] },
  { id: 65, chapterId: "trivia", question: "5月5日の端午の節句に飾る魚の飾りは？", answer: "こいのぼり", acceptableAnswers: ["鯉のぼり"] },
  { id: 66, chapterId: "trivia", question: "一年中、太陽が沈まない現象を何という？", answer: "白夜" },
  { id: 67, chapterId: "trivia", question: "世界で一番人口が多い国は？", answer: "インド" },
  { id: 68, chapterId: "trivia", question: "新1万円札に描かれている人物は？", answer: "渋沢栄一" },
  { id: 69, chapterId: "trivia", question: "パリにある有名な巨大鉄塔は？", answer: "エッフェル塔" },
  { id: 70, chapterId: "trivia", question: "エジプトにある巨大な四角錐の建造物は？", answer: "ピラミッド" },
  { id: 71, chapterId: "trivia", question: "昼と夜の長さがほぼ同じになるのは、春分の日と何の日？", answer: "秋分の日", acceptableAnswers: ["秋分"] },
  { id: 72, chapterId: "trivia", question: "オーストラリアの首都は？", answer: "キャンベラ" },
  {
    id: 73,
    chapterId: "trivia",
    question: "自由の女神像が左手に持っているものは？",
    answer: "銘板",
    acceptableAnswers: ["本", "独立宣言書"],
  },
  { id: 74, chapterId: "trivia", question: "日本で一番人口が多い都道府県は？", answer: "東京都", acceptableAnswers: ["東京"] },
  { id: 75, chapterId: "trivia", question: "金閣寺の本当の名前は？", answer: "鹿苑寺" },
  {
    id: 76,
    chapterId: "trivia",
    question: "オリンピックの五輪マークが表すものは？",
    answer: "世界の5つの大陸",
    acceptableAnswers: ["5つの大陸", "五大陸", "5大陸"],
  },
  { id: 77, chapterId: "trivia", question: "富士山がまたがっているのは、山梨県とどこ？", answer: "静岡県", acceptableAnswers: ["静岡"] },
  { id: 78, chapterId: "trivia", question: "10月31日の、仮装してお菓子をもらう行事は？", answer: "ハロウィン" },
  { id: 79, chapterId: "trivia", question: "世界で一番大きい島は？", answer: "グリーンランド" },
  { id: 80, chapterId: "trivia", question: "東北新幹線などで最高速度が最も速い列車は？", answer: "はやぶさ" },

  // 第5章: 言葉・ことわざ・○×クイズ (81-100)
  { id: 81, chapterId: "proverb", question: "「犬も歩けば〇に当たる」の〇に入る言葉は？", answer: "棒" },
  { id: 82, chapterId: "proverb", question: "「弘法にも〇の誤り」の〇に入る言葉は？", answer: "筆" },
  { id: 83, chapterId: "proverb", question: "「早起きは三文の〇」の〇に入る言葉は？", answer: "徳" },
  trueFalse(84, "proverb", "○×:信号機の並び順で一番右側にあるのは赤信号？", "○"),
  trueFalse(85, "proverb", "○×:1円玉の直径はちょうど1センチ？", "×"),
  trueFalse(86, "proverb", "○×:ハチミツは腐らないので賞味期限がないに等しい？", "○"),
  trueFalse(87, "proverb", "○×:かくれんぼで「もういいかい」と言われたら「まだだよ」と返す？", "○"),
  { id: 88, chapterId: "proverb", question: "「ちりも積もれば〇となる」の〇に入る言葉は？", answer: "山" },
  { id: 89, chapterId: "proverb", question: "「石の上にも〇年」の〇に入る言葉は？", answer: "3年", acceptableAnswers: ["3"] },
  trueFalse(90, "proverb", "○×:野球は1チーム9人、サッカーは11人？", "○"),
  trueFalse(91, "proverb", "○×:ナマケモノは泳ぐのが得意？", "○"),
  { id: 92, chapterId: "proverb", question: "「豚に〇〇」の〇〇に入る言葉は？", answer: "真珠" },
  trueFalse(93, "proverb", "○×:トウモロコシのひげの数と粒の数は同じ？", "○"),
  trueFalse(94, "proverb", "○×:ダチョウの目は自分の脳みそより大きい？", "○"),
  { id: 95, chapterId: "proverb", question: "「棚から〇〇もち」の〇〇に入る言葉は？", answer: "ぼた", acceptableAnswers: ["ぼたもち"] },
  { id: 96, chapterId: "proverb", question: "「笑う門には〇来たる」の〇に入る言葉は？", answer: "福" },
  trueFalse(97, "proverb", "○×:ジャンケンで一番歴史が古いのはチョキ？", "×"),
  { id: 98, chapterId: "proverb", question: "「三人寄れば〇〇の知恵」の〇〇に入る言葉は？", answer: "文殊" },
  trueFalse(99, "proverb", "○×:かかしは元々臭いものを焼いて設置したのが始まり？", "○"),
  { id: 100, chapterId: "proverb", question: "「終わりよければ〇〇すべてよし」の〇〇に入る言葉は？", answer: "すべて", acceptableAnswers: ["全て"] },
];

export function getQuizQuestionsForChapters(chapterIds: string[]): QuizQuestion[] {
  const ids = chapterIds.length > 0 ? chapterIds : ALL_QUIZ_CHAPTER_IDS;
  const set = new Set(ids);
  return QUIZ_QUESTIONS.filter((q) => set.has(q.chapterId));
}

export function isQuizAnswerCorrect(userAnswer: string, question: QuizQuestion): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  if (!normalizedUser) return false;
  const candidates = [question.answer, ...(question.acceptableAnswers ?? [])];
  return candidates.some((candidate) => normalizeAnswer(candidate) === normalizedUser);
}
