import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Keeps children mounted long enough to play an exit animation.
 * While hidden, it re-renders the last children it saw (so a suggestion or
 * error can animate out even after its data is gone).
 */
export function Presence({
  show,
  children,
  enter = 'anim-fade',
  exit = 'anim-fade-out',
  duration = 180,
  className = '',
}: {
  show: boolean
  children: ReactNode
  enter?: string
  exit?: string
  duration?: number
  className?: string
}) {
  const [mounted, setMounted] = useState(show)
  const last = useRef(children)
  if (show) last.current = children

  useEffect(() => {
    if (show) {
      setMounted(true)
      return
    }
    const t = window.setTimeout(() => setMounted(false), duration)
    return () => window.clearTimeout(t)
  }, [show, duration])

  if (!show && !mounted) return null
  return <div className={`${show ? enter : exit} ${className}`}>{last.current}</div>
}

/**
 * Horizontal collapse for toolbar items: width animates via the
 * `grid-template-columns: 0fr ↔ 1fr` trick so neighbours glide instead of jumping.
 * `gap` compensates the parent's flex gap while collapsed.
 */
export function CollapseX({
  show,
  children,
  gap = 8,
  duration = 220,
}: {
  show: boolean
  children: ReactNode
  gap?: number
  duration?: number
}) {
  const [mounted, setMounted] = useState(show)
  const [open, setOpen] = useState(show)
  // Clip only while animating, so hover shadows/lifts aren't cut off at rest.
  const [settled, setSettled] = useState(show)
  const last = useRef(children)
  if (show) last.current = children

  useEffect(() => {
    if (show) {
      setMounted(true)
      // Next frame → transition from 0fr to 1fr.
      let id = requestAnimationFrame(() => {
        id = requestAnimationFrame(() => setOpen(true))
      })
      const t = window.setTimeout(() => setSettled(true), duration + 40)
      return () => {
        cancelAnimationFrame(id)
        window.clearTimeout(t)
      }
    }
    setSettled(false)
    setOpen(false)
    const t = window.setTimeout(() => setMounted(false), duration)
    return () => window.clearTimeout(t)
  }, [show, duration])

  if (!mounted && !show) return null
  const ease = 'cubic-bezier(0.22, 1, 0.36, 1)'
  return (
    <div
      aria-hidden={!show || undefined}
      style={{
        display: 'grid',
        gridTemplateColumns: open ? '1fr' : '0fr',
        marginLeft: open ? 0 : -gap,
        opacity: open ? 1 : 0,
        transform: open ? 'none' : 'scale(0.9)',
        transition: `grid-template-columns ${duration}ms ${ease}, margin-left ${duration}ms ${ease}, opacity ${duration * 0.7}ms ${ease}, transform ${duration}ms ${ease}`,
        pointerEvents: show ? undefined : 'none',
      }}
    >
      <div className="flex min-w-0" style={{ overflow: settled && show ? 'visible' : 'hidden' }}>
        {last.current}
      </div>
    </div>
  )
}
