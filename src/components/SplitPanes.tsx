import { useRef } from 'react'
import type { ReactNode } from 'react'

const MIN_RATIO = 20
const MAX_RATIO = 80

interface SplitPanesProps {
  ratio: number
  onRatioChange: (ratio: number) => void
  left: ReactNode
  right: ReactNode
}

function clamp(value: number): number {
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, value))
}

export function SplitPanes({ ratio, onRatioChange, left, right }: SplitPanesProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const startDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    const startX = e.clientX
    const startRatio = ratio

    const onMove = (ev: PointerEvent) => {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      const delta = ((ev.clientX - startX) / rect.width) * 100
      onRatioChange(clamp(startRatio + delta))
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={containerRef} className="flex min-h-0 min-w-0 flex-1">
      <div
        style={{ width: `${ratio}%` }}
        className="min-w-0 overflow-y-auto overscroll-contain"
      >
        {left}
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize preview and editor"
        title="Drag to resize — double-click to reset"
        onPointerDown={startDrag}
        onDoubleClick={() => onRatioChange(50)}
        className="group relative w-px shrink-0 cursor-col-resize touch-none select-none bg-line transition-colors hover:bg-accent dark:bg-dark-line dark:hover:bg-dark-accent"
      >
        <span className="absolute inset-y-0 -left-2 -right-2" />
      </div>

      <div className="min-h-0 min-w-0 flex-1">{right}</div>
    </div>
  )
}
