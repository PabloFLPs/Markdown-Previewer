/**
 * Scroll sync between the rendered preview and the Markdown <textarea>.
 *
 * Both sides are mapped to *source line numbers*:
 *  - preview: top-level blocks carry `data-line` (added by `rehypeSourceLines`)
 *  - editor: a hidden mirror element measures where each source line starts
 *    once soft-wrapping is applied (cached per content + width).
 * Scrolling one side → fractional source line → pixel offset on the other side.
 */

type HastNode = {
  type: string
  properties?: Record<string, unknown>
  position?: { start: { line: number } }
  children?: HastNode[]
}

/** rehype plugin: tag top-level blocks with their source line (`data-line`). */
export function rehypeSourceLines() {
  return (tree: HastNode) => {
    for (const node of tree.children ?? []) {
      if (node.type === 'element' && node.position) {
        node.properties = { ...node.properties, dataLine: node.position.start.line }
      }
    }
  }
}

export interface Anchor {
  line: number // 1-based source line
  y: number // pixel offset inside the scroll container
}

/** Preview anchors: [line, top] for each tagged block, sorted by line. */
export function previewAnchors(container: HTMLElement): Anchor[] {
  const base = container.getBoundingClientRect().top - container.scrollTop
  const out: Anchor[] = []
  container.querySelectorAll<HTMLElement>('[data-line]').forEach((el) => {
    const line = Number(el.dataset.line)
    if (Number.isFinite(line)) out.push({ line, y: el.getBoundingClientRect().top - base })
  })
  return out.sort((a, b) => a.line - b.line)
}

let mirrorCache: { key: string; tops: number[] } | null = null

/** Pixel top of every source line inside the textarea (soft-wrap aware). */
export function editorLineTops(ta: HTMLTextAreaElement): number[] {
  const key = `${ta.clientWidth}|${ta.value.length}|${ta.value}`
  if (mirrorCache?.key === key) return mirrorCache.tops

  const cs = getComputedStyle(ta)
  const mirror = document.createElement('div')
  const copy = [
    'fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'tabSize',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'boxSizing', 'wordSpacing',
  ] as const
  for (const p of copy) mirror.style[p] = cs[p]
  Object.assign(mirror.style, {
    position: 'absolute',
    visibility: 'hidden',
    left: '-99999px',
    top: '0',
    width: `${ta.clientWidth}px`,
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    wordBreak: 'normal',
  })
  const frag = document.createDocumentFragment()
  for (const line of ta.value.split('\n')) {
    const d = document.createElement('div')
    d.textContent = line || '​'
    frag.appendChild(d)
  }
  mirror.appendChild(frag)
  document.body.appendChild(mirror)
  const tops = Array.from(mirror.children, (c) => (c as HTMLElement).offsetTop)
  mirror.remove()
  mirrorCache = { key, tops }
  return tops
}

/** Linear interpolation over sorted points (x → y), clamped at the ends. */
function interp(points: [number, number][], x: number): number {
  if (points.length === 0) return 0
  if (x <= points[0][0]) return points[0][1]
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i]
    if (x <= x1) {
      const [x0, y0] = points[i - 1]
      return x1 === x0 ? y1 : y0 + ((x - x0) / (x1 - x0)) * (y1 - y0)
    }
  }
  return points[points.length - 1][1]
}

/** Map a scroll position from one side to the other through source lines. */
export function mapScroll(
  from: 'preview' | 'editor',
  preview: HTMLElement,
  editor: HTMLTextAreaElement,
): number {
  const src = from === 'preview' ? preview : editor
  const dst = from === 'preview' ? editor : preview
  const srcMax = src.scrollHeight - src.clientHeight
  const dstMax = dst.scrollHeight - dst.clientHeight
  if (srcMax <= 0 || dstMax <= 0) return 0
  // Pin the ends so top/bottom always line up exactly.
  if (src.scrollTop <= 1) return 0
  if (src.scrollTop >= srcMax - 1) return dstMax

  const anchors = previewAnchors(preview)
  const tops = editorLineTops(editor)
  if (anchors.length === 0 || tops.length === 0) return (src.scrollTop / srcMax) * dstMax

  // Pair each preview anchor with the editor position of the same source line.
  const pairs: [number, number][] = anchors.map((a) => [a.y, tops[Math.min(a.line, tops.length) - 1] ?? 0])
  const points: [number, number][] = [[0, 0], ...pairs, [preview.scrollHeight, editor.scrollHeight]]
  const oriented = from === 'preview' ? points : points.map(([p, e]) => [e, p] as [number, number])
  oriented.sort((a, b) => a[0] - b[0])
  return Math.max(0, Math.min(dstMax, interp(oriented, src.scrollTop)))
}
