/**
 * Language-agnostic readability via LIX (works for en and pt-BR):
 *   LIX = words/sentences + 100 * longWords/words   (long = > 6 letters)
 * Buckets: <30 very easy · 30–40 easy · 40–50 moderate · 50–60 hard · >60 very hard
 */

export function stripMarkdown(md: string): string {
  return md
    .replace(/```[\s\S]*?```|~~~[\s\S]*?~~~/g, ' ')
    .replace(/`[^`]*`/g, ' code ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^\s*([-*+]|\d+[.)])\s+(.*)$/gm, '$2.')
    .replace(/^#{1,6}\s+(.*)$/gm, '$1.')
    .replace(/[*_~>#]/g, ' ')
}

export function lix(text: string): { lix: number; words: number } {
  const plain = stripMarkdown(text)
  const words = plain.match(/[\p{L}\p{N}'’-]+/gu) ?? []
  if (words.length === 0) return { lix: 0, words: 0 }
  const sentences = Math.max(1, (plain.match(/[.!?]+(\s|$)|\n\s*\n/g) ?? []).length)
  const long = words.filter((w) => w.replace(/[^\p{L}]/gu, '').length > 6).length
  return { lix: words.length / sentences + (100 * long) / words.length, words: words.length }
}

const CENTERS = [25, 35, 45, 55, 65]

/** Logits over the 5-point scale — closer bucket center ⇒ higher logit. */
export function readabilityScores(text: string, size = 5): number[] {
  const { lix: value, words } = lix(text)
  // Few words → flat distribution (fails the confidence gate on purpose).
  const sharpness = words < 30 ? 0.005 : words < 80 ? 0.03 : 0.05
  return CENTERS.slice(0, size).map((c) => -sharpness * (value - c) ** 2)
}
