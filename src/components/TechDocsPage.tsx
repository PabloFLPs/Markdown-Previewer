import { ArrowLeft, BookOpen } from 'lucide-react'
import { MarkdownPreview } from './MarkdownPreview'
// Single source of truth: the repo doc is rendered in-app with our own renderer.
import techDocs from '../../docs/SMART-ASSIST.md?raw'

interface TechDocsPageProps {
  closing?: boolean
  onBack: () => void
}

/** "How Smart Assist works" — technical docs (heuristics, Laya, eval). */
export function TechDocsPage({ closing = false, onBack }: TechDocsPageProps) {
  return (
    <main className={`flex-1 overflow-y-auto ${closing ? 'anim-fade-out' : 'anim-fade'}`}>
      <div className={`mx-auto w-full max-w-[900px] ${closing ? 'anim-stagger-out' : 'anim-stagger'}`}>
        <div className="flex items-center justify-between px-4 pt-8 sm:px-6 sm:pt-10">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:text-accent dark:text-dark-ink-muted dark:hover:text-dark-accent"
          >
            <ArrowLeft className="h-4 w-4" /> About
          </button>
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-muted dark:text-dark-ink-muted">
            <BookOpen className="h-3.5 w-3.5" /> Technical docs
          </span>
        </div>
        <div className="tech-docs">
          <MarkdownPreview content={techDocs} />
        </div>
      </div>
    </main>
  )
}
