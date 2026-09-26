import { Sparkles, X } from 'lucide-react'
import type { Suggestion } from '../assist/types'

interface SuggestionBarProps {
  suggestion: Suggestion
  onAccept: () => void
  onDismiss: () => void
}

const kbd =
  'rounded border border-line px-1 font-mono text-[10px] text-ink-muted dark:border-dark-line dark:text-dark-ink-muted'

export function SuggestionBar({ suggestion, onAccept, onDismiss }: SuggestionBarProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-slide-up pointer-events-auto flex items-center gap-3 rounded-lg border border-line bg-surface/95 px-3 py-2 text-xs shadow-sm backdrop-blur dark:border-dark-line dark:bg-dark-surface-soft/95"
    >
      <Sparkles className="anim-pop h-3.5 w-3.5 shrink-0 text-accent dark:text-dark-accent" />
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-ink dark:text-dark-ink">{suggestion.label}</div>
        {suggestion.detail && (
          <div className="truncate font-mono text-[11px] text-ink-muted dark:text-dark-ink-muted">
            {suggestion.detail}
          </div>
        )}
      </div>
      <span
        title="Engine confidence"
        className="hidden shrink-0 tabular-nums text-ink-muted sm:inline dark:text-dark-ink-muted"
      >
        {Math.round(suggestion.confidence * 100)}%
      </span>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onAccept}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-accent px-2 py-1 font-medium text-white transition-colors hover:bg-accent-strong dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-dark-accent-strong"
      >
        Accept <span className="hidden rounded bg-white/20 px-1 font-mono text-[10px] sm:inline">Tab</span>
      </button>
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={onDismiss}
        aria-label="Dismiss suggestion (Esc)"
        title="Dismiss (Esc)"
        className="inline-flex shrink-0 items-center gap-1 text-ink-muted transition-colors hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink"
      >
        <span className={`hidden sm:inline ${kbd}`}>Esc</span>
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
