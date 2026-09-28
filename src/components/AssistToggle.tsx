import { ChevronDown, Sparkles } from 'lucide-react'
import type { AssistMode } from '../assist/types'
import type { EngineStatus } from '../assist/useSmartAssist'
import { useI18n } from '../hooks/useI18n'
import type { MessageKey, Vars } from '../lib/i18n'

interface AssistToggleProps {
  mode: AssistMode
  status: EngineStatus
  onChange: (mode: AssistMode) => void
  /** Icon-only (mobile): the native select sits invisibly on top. */
  compact?: boolean
}

function statusText(mode: AssistMode, status: EngineStatus, t: (k: MessageKey, v?: Vars) => string): string {
  if (mode === 'off') return t('assist.status.off')
  switch (status.state) {
    case 'loading':
      return status.progress != null ? t('assist.status.loadingPct', { pct: Math.round(status.progress * 100) }) : t('assist.status.loading')
    case 'fallback':
      return t('assist.status.fallback', { reason: status.reason })
    case 'ready':
      return status.kind === 'model' ? t('assist.status.model') : t('assist.status.heuristics')
    default:
      return t('assist.label')
  }
}

export function AssistToggle({ mode, status, onChange, compact = false }: AssistToggleProps) {
  const { t } = useI18n()
  const active = mode !== 'off'
  const warn = status.state === 'fallback'
  return (
    <label
      title={statusText(mode, status, t)}
      className={`press group relative inline-flex items-center gap-1.5 rounded-md border ${compact ? 'h-9 w-9 justify-center' : 'h-8 px-2'} text-xs font-medium transition-colors ${
        active
          ? 'border-accent text-accent hover:bg-accent/5 dark:border-dark-accent dark:text-dark-accent dark:hover:bg-dark-accent/10'
          : 'border-line text-ink hover:border-accent hover:text-accent dark:border-dark-line dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent'
      } bg-surface dark:bg-dark-surface-soft`}
    >
      <Sparkles className={`hover-sparkle h-3.5 w-3.5 ${status.state === 'loading' ? 'animate-pulse' : ''}`} />
      {warn && <span className="anim-pop absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500" />}
      <span className="sr-only">{t('assist.label')}</span>
      {/* Visible label sized to the current value; the native select sits invisibly on top. */}
      {!compact && (
        <>
          <span>Assist: {t(`assist.short.${mode}`)}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </>
      )}
      <select
        value={mode}
        onChange={(e) => onChange(e.target.value as AssistMode)}
        aria-label={t('assist.label')}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        <option value="off">{t('assist.option.off')}</option>
        <option value="heuristics">{t('assist.option.heuristics')}</option>
        <option value="model" disabled>
          {t('assist.option.model')}
        </option>
      </select>
    </label>
  )
}
