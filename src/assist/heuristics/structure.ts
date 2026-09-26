/**
 * Heuristic `noul` for F3. `state` is the local context (±2 lines),
 * `statement` names the candidate line in quotes and the intended structure.
 */
export function structureProbability(state: string, statement: string): number {
  const m = /"(.*)"/.exec(statement)
  if (!m) return 0.5
  const line = m[1]
  const others = state.split('\n').filter((l) => l !== line && l.trim() !== '')
  const words = line.replace(/[*#=\-+\d.)]/g, ' ').trim().split(/\s+/).filter(Boolean).length

  if (/heading/.test(statement)) {
    if (/^\*\*/.test(line)) {
      // **Title** alone on a line.
      let p = 0.86
      if (words > 10) p -= 0.35
      if (/[.!?]\*\*$/.test(line)) p -= 0.3
      if (/:\s*$|\*\*:$|:\*\*$/.test(line)) p -= 0.12
      return clamp(p)
    }
    if (/^={2,}/.test(line)) return 0.9
    if (/^#{2,}/.test(line)) return 0.93
    if (/^#/.test(line)) return words >= 2 ? 0.88 : 0.55
  }

  if (/bullet list/.test(statement)) {
    if (/^\s*-\d/.test(line)) return 0.2 // "-5 degrees" — negative number
    if (/^\s*\*[^*\s][^*]*\*/.test(line)) return 0.1 // *emphasis*
    const listNeighbors = others.filter((l) => /^\s*[-+*]\s?\S/.test(l)).length
    return clamp(0.8 + listNeighbors * 0.07)
  }

  if (/numbered list/.test(statement)) {
    const numNeighbors = others.filter((l) => /^\s*\d{1,3}[.)]\s?\S/.test(l)).length
    return clamp(0.78 + numNeighbors * 0.08)
  }
  return 0.5
}

function clamp(p: number): number {
  return Math.max(0.01, Math.min(0.97, p))
}
