// カタカナをひらがなに変換し、全角/半角・大文字小文字・空白の表記ゆれを吸収して比較する。
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60));
}
