import type { PasteKind } from '../questions.ts'
import { classifyLanguage } from './language.ts'
import { parseJsonLike } from '../json.ts'

export function nonEmptyLines(text: string): string[] {
  return text.replace(/\r\n?/g, '\n').split('\n').filter((l) => l.trim() !== '')
}

/** Consistent delimiter count across lines → strong tabular evidence. */
function delimiterConsistency(lines: string[], split: (l: string) => number): number {
  const counts = lines.map(split)
  if (counts[0] < 1) return 0
  const same = counts.filter((c) => c === counts[0]).length
  return same / counts.length
}

export function splitCsvLine(line: string): string[] {
  const cells: string[] = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"'
        i++
      } else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"' && cur.trim() === '') quoted = true
    else if (ch === ',') {
      cells.push(cur.trim())
      cur = ''
    } else cur += ch
  }
  cells.push(cur.trim())
  return cells
}

/** Column boundaries shared by every line (2+ spaces gaps). */
export function alignedColumns(lines: string[]): number[] | null {
  if (lines.length < 2) return null
  const width = Math.max(...lines.map((l) => l.length))
  const blankAt = (l: string, c: number) => c >= l.length || l[c] === ' '
  // isGap[c]: column c and c-1 are blank in every line (a 2+ space gutter).
  const isGap = (c: number) => c > 0 && lines.every((l) => blankAt(l, c) && blankAt(l, c - 1))
  const starts = [0]
  for (let c = 1; c < width; c++) {
    if (isGap(c - 1) && !lines.every((l) => blankAt(l, c))) starts.push(c)
  }
  return starts.length >= 2 ? starts : null
}

const BULLET_RE = /^\s*([•·▪◦‣–—*+-]|\d{1,3}[.)]|[a-z][.)])\s+\S/

export function classifyPaste(text: string): Record<PasteKind, number> {
  const lines = nonEmptyLines(text)
  const s: Record<PasteKind, number> = { prose: 1.5, table: 0, csv: 0, tsv: 0, list: 0, code: 0, json: 0 }
  // JSON first — a minified single-line payload is still JSON.
  const json = parseJsonLike(text)
  if (json) return { ...s, json: json.strict ? 9 : 8, prose: 0 }
  if (lines.length < 2) return { ...s, prose: 5 }

  // TSV
  const tabC = delimiterConsistency(lines, (l) => l.split('\t').length - 1)
  if (tabC > 0) s.tsv = tabC >= 0.99 ? 7 : tabC * 3

  // CSV — consistent comma cells and short cells (prose also has commas).
  const cells = lines.map((l) => splitCsvLine(l))
  const commaC = delimiterConsistency(lines, (l) => splitCsvLine(l).length - 1)
  if (commaC > 0 && !s.tsv) {
    const avgCell = cells.flat().reduce((a, c) => a + c.length, 0) / Math.max(1, cells.flat().length)
    const sentences = lines.filter((l) => /[a-zà-ÿ]{3,}[.!?]\s+[A-ZÀ-Ý]/.test(l)).length
    const wordyCells = cells.flat().filter((c) => c.split(/\s+/).length > 5).length
    s.csv = (commaC >= 0.99 ? 5 : commaC * 2) + (avgCell < 25 ? 1.5 : -2) - sentences * 1.5 - wordyCells * 2
  }

  // Whitespace-aligned table
  const cols = alignedColumns(lines)
  if (cols && !s.tsv) s.table = 3 + Math.min(3, cols.length - 1) * 0.8 + (lines.length >= 3 ? 1 : 0)

  // List — explicit bullets, or many short lines without sentence punctuation.
  const bulleted = lines.filter((l) => BULLET_RE.test(l)).length / lines.length
  const short = lines.filter((l) => l.trim().length <= 60 && !/[.;:{}()=]\s*$/.test(l.trim())).length / lines.length
  s.list = bulleted * 6 + (lines.length >= 3 ? short * 2 : 0) - (cols ? 2 : 0)

  // Code — reuse language evidence.
  const lang = classifyLanguage(text)
  const { plaintext, markdown, ...codeLangs } = lang
  void markdown
  const bestCode = Math.max(...Object.values(codeLangs))
  s.code = Math.max(0, bestCode) * 0.9 - Math.max(0, plaintext) * 0.5
  const structural = lines.filter((l) => /[{};]\s*$|^\s*[})\]]/.test(l) || /^(\t| {2,})\S/.test(l)).length / lines.length
  s.code += structural * 3
  if (s.json >= 8) s.code = Math.min(s.code, 4)

  // Prose — long lines with sentences.
  const sentenceLines = lines.filter((l) => /[a-zà-ÿ]{2,}[.!?]["')]?(\s|$)/.test(l) && l.split(/\s+/).length >= 8).length
  s.prose += (sentenceLines / lines.length) * 5
  return s
}
