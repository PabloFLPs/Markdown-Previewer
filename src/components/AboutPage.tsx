import {
  ArrowLeft,
  ClipboardPaste,
  Code2,
  Columns2,
  Download,
  FileText,
  Gauge,
  Heading,
  Lock,
  Moon,
  Save,
  History,
  Sparkles,
  Table,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { AppIconPicker } from './AppIconPicker'
import type { AppIconId } from '../lib/appIcons'
import { keyLabel, type KeyStyle, type KeyToken } from '../lib/keyStyle'
import { useKeyStyle } from '../hooks/useKeyStyle'
import { createContext, useContext } from 'react'

const KeyStyleContext = createContext<KeyStyle>('mac')

interface AboutPageProps {
  onBack: () => void
  closing?: boolean
  onTrySmartAssist: () => void
  appIcon: AppIconId
  onAppIconChange: (id: AppIconId) => void
}

const SHORTCUTS: [KeyToken[], string][] = [
  [['mod', 'o'], 'Open a file'],
  [['mod', 'n'], 'New document'],
  [['mod', 's'], 'Export (.md download)'],
  [['mod', 'shift', 'c'], 'Copy Markdown'],
  [['mod', 'shift', 'h'], 'Recent documents'],
  [['tab'], 'Accept a Smart Assist suggestion'],
  [['esc'], 'Dismiss a suggestion'],
]

export function AboutPage({ closing = false, onBack, onTrySmartAssist, appIcon, onAppIconChange }: AboutPageProps) {
  const { keyStyle, setKeyStyle } = useKeyStyle()
  return (
    <KeyStyleContext.Provider value={keyStyle}>
    <main className={`flex-1 overflow-y-auto ${closing ? 'anim-fade-out' : 'anim-fade'}`}>
      <div className={`mx-auto w-full max-w-[760px] px-4 py-8 sm:px-6 sm:py-10 ${closing ? 'anim-stagger-out' : 'anim-stagger'}`}>
        <button
          type="button"
          onClick={onBack}
          className="-ml-2 mb-8 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-ink-muted transition-colors hover:text-accent dark:text-dark-ink-muted dark:hover:text-dark-accent"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        <h1 className="text-2xl font-semibold tracking-tight">Smart Markdown Previewer</h1>
        <p className="mt-3 text-sm leading-6 text-ink-muted dark:text-dark-ink-muted">
          A quiet place to read and write Markdown — with a small, local assistant that notices what you
          meant to write and offers to fix it. Nothing you open here ever leaves your browser.
        </p>

        <Section title="Appearance">
          <p className="mb-4 text-sm leading-6 text-ink-muted dark:text-dark-ink-muted">
            App icon and accent colour — shown in the browser tab, the header, and across the interface.
          </p>
          <AppIconPicker value={appIcon} onChange={onAppIconChange} />
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-muted dark:text-dark-ink-muted">Keyboard shortcut style</p>
            <KeyStyleToggle value={keyStyle} onChange={setKeyStyle} />
          </div>
        </Section>

        <Section title="Smart Assist" badge="local · opt-in">
          <p className="mb-4 text-sm leading-6 text-ink-muted dark:text-dark-ink-muted">
            Turn it on from the <strong className="font-medium text-ink dark:text-dark-ink">Assist</strong> menu
            in the editor header. It never changes your text on its own — it only suggests, and only when it's
            confident. <Keys k={['tab']} /> accepts, <Keys k={['esc']} /> dismisses, <Keys k={['mod', 'z']} /> undoes.
          </p>
          <Feature icon={<Code2 />} title="Code block languages">
            Leave a <code>```</code> block without a language and it suggests one (TypeScript, Python, Bash, SQL
            and ~17 more), so your code gets properly labelled.
          </Feature>
          <Feature icon={<Table />} title="Smart paste">
            Paste CSV, spreadsheet cells, terminal output, bullet lists or JSON — your paste lands untouched,
            then you're offered a clean Markdown table, list or code block.
          </Feature>
          <Feature icon={<Heading />} title="Structure hints">
            Catches the near-misses: <code>**Title**</code> used as a heading, <code>#Heading</code> without a
            space, <code>-item</code>, <code>1)item</code>, <code>== Title ==</code>.
          </Feature>
          <Feature icon={<Gauge />} title="Readability dots">
            Each <code>##</code> section gets a subtle dot in the preview — green to red — with a tooltip.
            Works in English and Portuguese.
          </Feature>
          <p className="mt-4 text-xs leading-5 text-ink-muted dark:text-dark-ink-muted">
            Modes: <strong className="font-medium">Heuristics</strong> runs instantly with no download.{' '}
            <strong className="font-medium">Local model</strong> (coming soon) runs a small decision model
            entirely on your device.
          </p>
          <button
            type="button"
            onClick={onTrySmartAssist}
            className="press group mt-5 inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-strong dark:bg-dark-accent dark:text-dark-surface dark:hover:bg-dark-accent-strong"
          >
            <Sparkles className="hover-sparkle h-4 w-4" /> Try it on a sample document
          </button>
        </Section>

        <Section title="Reading & writing">
          <Feature icon={<FileText />} title="Open anything Markdown">
            Drag a <code>.md</code> file anywhere onto the window, use Open, or paste text straight onto the
            empty page.
          </Feature>
          <Feature icon={<Columns2 />} title="Live split editor">
            Edit on the right, watch the preview update on the left. Drag the divider to resize; double-click
            it to reset. On phones the editor comes first.
          </Feature>
          <Feature icon={<Save />} title="Autosave">
            Your current document is kept in this browser, so a refresh never loses work. An asterisk next to
            the filename means there are changes you haven't exported.
          </Feature>
          <Feature icon={<History />} title="Recent documents">
            Every document you open, paste or write is kept in Recent (clock icon, or{' '}
            <Keys k={['mod', 'shift', 'h']} />) — switch between them freely, nothing is lost. Up to 15, stored only in
            this browser.
          </Feature>
          <Feature icon={<Download />} title="Export & copy">
            Download the current text as a <code>.md</code> file, or copy the raw Markdown in one click.
          </Feature>
          <Feature icon={<ClipboardPaste />} title="GitHub-flavoured Markdown">
            Tables, task lists, strikethrough and autolinks render out of the box.
          </Feature>
          <Feature icon={<Moon />} title="Light & dark">
            Remembered between visits.
          </Feature>
        </Section>

        <Section title="Keyboard shortcuts">
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            {SHORTCUTS.map(([k, v]) => (
              <div key={k.join('+')} className="contents">
                <dt>
                  <Keys k={k} />
                </dt>
                <dd className="text-ink-muted dark:text-dark-ink-muted">{v}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Privacy">
          <Feature icon={<Lock />} title="Local-first, always">
            No accounts, no server, no uploads. Files are read by your browser and Smart Assist runs on your
            device. Once loaded, the app works offline.
          </Feature>
        </Section>
      </div>
    </main>
    </KeyStyleContext.Provider>
  )
}

function Section({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  return (
    <section className="mt-12 anim-rise">
      <h2 className="mb-5 flex items-baseline gap-2 border-b border-line pb-2 text-xs font-semibold uppercase tracking-wider text-ink-muted dark:border-dark-line dark:text-dark-ink-muted">
        {title}
        {badge && <span className="font-normal normal-case tracking-normal text-accent dark:text-dark-accent">{badge}</span>}
      </h2>
      {children}
    </section>
  )
}

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div className="group mb-5 flex gap-3">
      <span className="mt-0.5 shrink-0 text-accent transition-transform duration-200 group-hover:scale-125 group-hover:-rotate-6 dark:text-dark-accent [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
      <div>
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-ink-muted dark:text-dark-ink-muted [&_code]:rounded [&_code]:bg-surface-soft [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.85em] dark:[&_code]:bg-dark-surface-raised">
          {children}
        </p>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded border border-line bg-surface-soft px-1.5 py-0.5 font-mono text-[11px] text-ink dark:border-dark-line dark:bg-dark-surface-raised dark:text-dark-ink">
      {children}
    </kbd>
  )
}

function Keys({ k }: { k: KeyToken[] }) {
  const style = useContext(KeyStyleContext)
  return (
    <span className="inline-flex items-center gap-0.5 align-baseline">
      {k.map((t, i) => (
        <span key={t} className="inline-flex items-center gap-0.5">
          {style === 'windows' && i > 0 && <span className="text-[10px] text-ink-muted dark:text-dark-ink-muted">+</span>}
          <Kbd>{keyLabel(t, style)}</Kbd>
        </span>
      ))}
    </span>
  )
}

function KeyStyleToggle({ value, onChange }: { value: KeyStyle; onChange: (s: KeyStyle) => void }) {
  const options: [KeyStyle, string, string][] = [
    ['mac', 'macOS', '⌘ ⇧'],
    ['windows', 'Windows / Linux', 'Ctrl Shift'],
  ]
  return (
    <div role="radiogroup" aria-label="Keyboard shortcut style" className="relative flex w-full rounded-md border border-line p-0.5 sm:inline-flex sm:w-auto dark:border-dark-line">
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded bg-accent/10 transition-transform duration-200 ease-out dark:bg-dark-accent/15"
        style={{ transform: value === 'windows' ? 'translateX(100%)' : 'none' }}
      />
      {options.map(([id, label, hint]) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={value === id}
          onClick={() => onChange(id)}
          className={`relative z-10 flex min-w-0 flex-1 flex-col sm:w-36 sm:flex-none items-center rounded px-3 py-1 text-xs ${
            value === id ? 'text-accent dark:text-dark-accent' : 'text-ink-muted hover:text-ink dark:text-dark-ink-muted dark:hover:text-dark-ink'
          }`}
        >
          <span className="font-medium">{label}</span>
          <span className="font-mono text-[10px] opacity-70">{hint}</span>
        </button>
      ))}
    </div>
  )
}
