import { useMemo, useRef } from 'react'
import { ArrowLeft, BookOpen, Sparkles } from 'lucide-react'
import { MarkdownPreview } from './MarkdownPreview'
// Single source of truth: the repo docs are rendered in-app with our own renderer.
import techDocsEn from '../../docs/SMART-ASSIST.md?raw'
import techDocsPt from '../../docs/SMART-ASSIST.pt-BR.md?raw'
import { useI18n } from '../hooks/useI18n'

interface TechDocsPageProps {
  closing?: boolean
  onBack: () => void
}

/** Split the doc into its H1 title, intro (before the first `##`) and body, plus `##` titles for the TOC. */
function parseDoc(md: string) {
  const lines = md.split('\n')
  const title = (lines.find((l) => l.startsWith('# ')) ?? '').replace(/^#\s+/, '')
  const rest = lines.filter((l) => !l.startsWith('# ')).join('\n')
  const sections = [...rest.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].replace(/^\d+\.\s*/, ''))
  return { title, body: rest, sections }
}

/** "How Smart Assist works" — technical docs (heuristics, Laya, evaluation). */
export function TechDocsPage({ closing = false, onBack }: TechDocsPageProps) {
  const { t, lang } = useI18n()
  const bodyRef = useRef<HTMLDivElement>(null)
  const doc = useMemo(() => parseDoc(lang === 'pt-BR' ? techDocsPt : techDocsEn), [lang])

  const jumpTo = (i: number) => {
    const h = bodyRef.current?.querySelectorAll('.markdown-body h2')[i]
    h?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <main className={`scroll-area min-h-0 flex-1 overflow-y-auto ${closing ? 'anim-fade-out' : 'anim-fade'}`}>
      <div className={`mx-auto w-full max-w-[900px] ${closing ? 'anim-stagger-out' : 'anim-stagger'}`}>
        <div className="flex items-center justify-between px-4 pt-8 sm:px-6 sm:pt-10">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:text-accent dark:text-dark-ink-muted dark:hover:text-dark-accent"
          >
            <ArrowLeft className="h-4 w-4" /> {t('docs.backToAbout')}
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-accent dark:text-dark-accent">
            <BookOpen className="h-3.5 w-3.5" /> {t('docs.badge')}
          </span>
        </div>

        {/* Hero — same accent identity as the About page. */}
        <header className="docs-hero relative mx-4 mt-6 overflow-hidden rounded-xl border border-accent/25 p-6 sm:mx-6 sm:p-8 dark:border-dark-accent/25">
          <div className="flex items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-white shadow-sm dark:bg-dark-accent dark:text-dark-surface">
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{doc.title}</h1>
              <p className="mt-1 text-sm font-medium text-accent dark:text-dark-accent">{t('app.tagline')}</p>
            </div>
          </div>
          {doc.sections.length > 0 && (
            <nav aria-label={t('docs.contents')} className="mt-6">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
                {t('docs.contents')}
              </p>
              <ol className="flex flex-wrap gap-2">
                {doc.sections.map((s, i) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => jumpTo(i)}
                      className="press inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1 text-xs text-ink transition-colors hover:border-accent hover:text-accent dark:border-dark-line dark:bg-dark-surface-soft dark:text-dark-ink dark:hover:border-dark-accent dark:hover:text-dark-accent"
                    >
                      <span className="font-mono text-[10px] text-accent dark:text-dark-accent">{i + 1}</span>
                      {s}
                    </button>
                  </li>
                ))}
              </ol>
            </nav>
          )}
        </header>

        <div ref={bodyRef} className="tech-docs">
          <MarkdownPreview content={doc.body} />
        </div>
      </div>
    </main>
  )
}
