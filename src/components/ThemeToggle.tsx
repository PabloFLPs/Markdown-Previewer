import { Moon, Sun } from 'lucide-react'
import type { Theme } from '../hooks/useTheme'
import { useI18n } from '../hooks/useI18n'

interface ThemeToggleProps {
  theme: Theme
  onToggle: () => void
}

export function ThemeToggle({ theme, onToggle }: ThemeToggleProps) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-surface text-ink-muted transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink-muted dark:hover:border-dark-accent dark:hover:text-dark-accent"
    >
      <span key={theme} className="anim-spin-in inline-flex">
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </span>
    </button>
  )
}