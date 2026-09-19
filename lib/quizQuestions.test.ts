import { describe, expect, it } from "vitest";
import {
  ALL_QUIZ_CHAPTER_IDS,
  QUIZ_CHAPTERS,
  QUIZ_QUESTIONS,
  getQuizQuestionsForChapters,
  isQuizAnswerCorrect,
} from "./quizQuestions";

describe("QUIZ_QUESTIONS data", () => {
  it("contains exactly 100 questions", () => {
    expect(QUIZ_QUESTIONS).toHaveLength(100);
  });

  it("has unique, sequential ids from 1 to 100", () => {
    const ids = QUIZ_QUESTIONS.map((q) => q.id).sort((a, b) => a - b);
    expect(new Set(ids).size).toBe(100);
    expect(ids).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  it("assigns every question to a known chapter", () => {
    const chapterIds = new Set(QUIZ_CHAPTERS.map((c) => c.id));
    for (const q of QUIZ_QUESTIONS) {
      expect(chapterIds.has(q.chapterId)).toBe(true);
    }
  });

  it("has exactly 5 chapters of 20 questions each", () => {
    expect(QUIZ_CHAPTERS).toHaveLength(5);
    for (const chapter of QUIZ_CHAPTERS) {
      const count = QUIZ_QUESTIONS.filter((q) => q.chapterId === chapter.id).length;
      expect(count).toBe(20);
    }
  });

  it("gives every question a non-empty question text and answer", () => {
    for (const q of QUIZ_QUESTIONS) {
      expect(q.question.trim().length).toBeGreaterThan(0);
      expect(q.answer.trim().length).toBeGreaterThan(0);
    }
  });
});

describe("getQuizQuestionsForChapters", () => {
  it("returns all questions when no chapter is specified", () => {
    expect(getQuizQuestionsForChapters([])).toHaveLength(100);
  });

  it("returns only questions from the requested chapter", () => {
    const result = getQuizQuestionsForChapters(["wit"]);
    expect(result).toHaveLength(20);
    expect(result.every((q) => q.chapterId === "wit")).toBe(true);
  });

  it("returns questions across multiple requested chapters", () => {
    const result = getQuizQuestionsForChapters(["wit", "nature"]);
    expect(result).toHaveLength(40);
  });

  it("ignores unknown chapter ids gracefully", () => {
    expect(getQuizQuestionsForChapters(["no-such-chapter", ...ALL_QUIZ_CHAPTER_IDS])).toHaveLength(100);
  });
});

describe("isQuizAnswerCorrect", () => {
  const question = QUIZ_QUESTIONS.find((q) => q.id === 30)!; // 太陽系の中で一番大きな惑星 -> 木星

  it("accepts an exact match", () => {
    expect(isQuizAnswerCorrect("木星", question)).toBe(true);
  });

  it("accepts answers with different whitespace/casing after normalization", () => {
    expect(isQuizAnswerCorrect("  木星  ", question)).toBe(true);
  });

  it("rejects a wrong answer", () => {
    expect(isQuizAnswerCorrect("土星", question)).toBe(false);
  });

  it("rejects an empty answer", () => {
    expect(isQuizAnswerCorrect("", question)).toBe(false);
    expect(isQuizAnswerCorrect("   ", question)).toBe(false);
  });

  it("accepts any listed alternate answer", () => {
    const withAlts = QUIZ_QUESTIONS.find((q) => q.id === 1)!; // 飛行機 / 鳥
    expect(isQuizAnswerCorrect("鳥", withAlts)).toBe(true);
  });

  it("accepts common ○×-style variants for maru/batsu questions", () => {
    const maru = QUIZ_QUESTIONS.find((q) => q.id === 84)!; // ○
    expect(isQuizAnswerCorrect("まる", maru)).toBe(true);
    expect(isQuizAnswerCorrect("○", maru)).toBe(true);
    expect(isQuizAnswerCorrect("×", maru)).toBe(false);

    const batsu = QUIZ_QUESTIONS.find((q) => q.id === 85)!; // ×
    expect(isQuizAnswerCorrect("ばつ", batsu)).toBe(true);
    expect(isQuizAnswerCorrect("○", batsu)).toBe(false);
  });
});
