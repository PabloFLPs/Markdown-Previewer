import { ChevronDown, Sparkles } from 'lucide-react'
import type { AssistMode } from '../assist/types'
import type { EngineStatus } from '../assist/useSmartAssist'

interface AssistToggleProps {
  mode: AssistMode
  status: EngineStatus
  onChange: (mode: AssistMode) => void
  /** Icon-only (mobile): the native select sits invisibly on top. */
  compact?: boolean
}

function statusText(mode: AssistMode, status: EngineStatus): string {
  if (mode === 'off') return 'Smart Assist is off'
  switch (status.state) {
    case 'loading':
      return status.progress != null ? `Loading local model… ${Math.round(status.progress * 100)}%` : 'Loading local model…'
    case 'fallback':
      return `Local model unavailable — using heuristics (${status.reason})`
    case 'ready':
      return status.kind === 'model' ? 'Smart Assist: local model' : 'Smart Assist: heuristics (no download)'
    default:
      return 'Smart Assist'
  }
}

export function AssistToggle({ mode, status, onChange, compact = false }: AssistToggleProps) {
  const active = mode !== 'off'
  const warn = status.state === 'fallback'
  return (
    <label
      title={statusText(mode, status)}
      className={`press group relative inline-flex items-center gap-1.5 rounded-md border ${compact ? 'h-9 w-9 justify-center' : 'h-8 px-2'} text-xs font-medium transition-colors ${
        active
          ? 'border-accent text-accent hover:bg-accent/5 dark:border-dark-accent dark:text-dark-accent dark:hover:bg-dark-accent/10'
          : 'border-line text-ink hover:border-accent hover:text-accent dark:border-dark-line dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent'
      } bg-surface dark:bg-dark-surface-soft`}
    >
      <Sparkles className={`hover-sparkle h-3.5 w-3.5 ${status.state === 'loading' ? 'animate-pulse' : ''}`} />
      {warn && <span className="anim-pop absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
      <span className="sr-only">Smart Assist (local AI)</span>
      {/* Visible label sized to the current value; the native select sits invisibly on top. */}
      {!compact && (
        <>
          <span>Assist: {mode === 'off' ? 'Off' : mode === 'heuristics' ? 'Heuristics' : 'Local model'}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </>
      )}
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as AssistMode)}
        aria-label="Smart Assist (local AI)"
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="off">Assist: Off</option>
        <option value="heuristics">Assist: Heuristics</option>
        <option value="model" disabled>
          Assist: Local model (soon)
        </option>
      </select>
    </label>
  )
}
