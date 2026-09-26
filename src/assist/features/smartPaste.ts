import type { DecisionEngine, Suggestion } from '../types.ts'
import { passesGate } from '../types.ts'
import { isPasteCandidate } from '../prefilter.ts'
import { LANGUAGES, PASTE_KINDS, Q, type Language, type PasteKind } from '../questions.ts'
import { alignedToTable, csvToTable, toCodeBlock, toList, tsvToTable } from '../convert.ts'
import { hash } from './codeFence.ts'

/** F2 — the paste already happened untouched; offer to convert the pasted range. */
export async function suggestPasteConversion(
  pasted: string,
  from: number,
  engine: DecisionEngine,
  signal?: AbortSignal,
): Promise<Suggestion | null> {
  if (!isPasteCandidate(pasted)) return null
  // Already Markdown structure? Nothing to offer.
  if (/^\s*(\|.*\||```|~~~|#{1,6}\s|[-*+]\s)/.test(pasted)) return null

  const d = await engine.choice<PasteKind>(pasted, Q.pasteKind, PASTE_KINDS)
  if (signal?.aborted) return null
  if (!passesGate(Object.values(d.probs) as number[], 0.8, 0.2)) return null

  let insert: string | null = null
  let label = ''
  switch (d.choice) {
    case 'csv':
      insert = csvToTable(pasted)
      label = 'Convert CSV to Markdown table'
      break
    case 'tsv':
      insert = tsvToTable(pasted)
      label = 'Convert to Markdown table'
      break
    case 'table':
      insert = alignedToTable(pasted)
      label = 'Convert to Markdown table'
      break
    case 'list':
      insert = toList(pasted)
      label = 'Convert to Markdown list'
      break
    case 'json':
      insert = toCodeBlock(pasted, 'json')
      label = 'Wrap in ```json code block'
      break
    case 'code': {
      const lang = await engine.choice<Language>(pasted, Q.fenceLanguage, LANGUAGES)
      const ok = passesGate(Object.values(lang.probs) as number[], 0.8, 0.2)
      const tag = ok ? lang.choice : 'plaintext'
      insert = toCodeBlock(pasted, tag)
      label = tag === 'plaintext' ? 'Wrap in code block' : `Wrap in \`\`\`${tag} code block`
      break
    }
    case 'prose':
      return null
  }
  if (!insert || insert === pasted) return null
  return {
    key: `smartPaste:${hash(pasted)}`,
    feature: 'smartPaste',
    label,
    detail: PASTE_KINDS[d.choice],
    confidence: d.probs[d.choice],
    edit: { from, to: from + pasted.length, insert },
    expected: pasted,
  }
}
