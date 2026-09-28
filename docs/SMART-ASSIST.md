# Smart Assist — Technical Documentation

Smart Assist is the optional, local "writing radar" of Marksage. It watches the
editor, detects a small set of fixable situations, and **suggests** an edit the user can accept
(`Tab`) or dismiss (`Esc`). Nothing is sent over the network and nothing is ever applied
automatically.

> Design origin and open questions: `SMART-ASSIST — Implementation Context.md` (repo root).
> Contributor conventions: `AGENTS.md`. Portuguese version: `docs/SMART-ASSIST.pt-BR.md`.

---

## 1. Why "decision models"

Smart Assist is built around **decision models** rather than generative models. A decision model
answers a *typed question over a set of answers fixed up front*:

| Decision type | Question shape | Returns |
|---|---|---|
| `choice` | "Which of these options?" | the chosen key + a probability per option |
| `score` | "Where on this ordered scale?" | an index + a probability per step |
| `noul` | "Is this statement true?" | a single probability in `[0, 1]` |

Because the answer space is closed, the output can never be malformed. The rule of the codebase:

> **The engine decides; our TypeScript code acts.** If you can't list the possible answers up
> front, it's not a Smart Assist job.

This is also why the project explicitly avoids generative autocomplete, rewriting, and "AI
spell-check" (deterministic tools such as `nspell`/`remark-lint` are the right tool there).

---

## 2. Architecture

```
textarea ──(debounce 400 ms / paste / 2 s idle)──► prefilter.ts   "is there a candidate?"
                                                     │  no → stop (no engine call)
                                                     ▼
                                              DecisionEngine
                                   ┌─────────────────┴─────────────────┐
                            HeuristicEngine                      LayaEngine
                         (always available, sync-ish)     (Web Worker, scaffolded)
                                   └─────────────────┬─────────────────┘
                                                     ▼
                                     confidence gate (passesGate)
                                                     ▼
                              Suggestion { edit, expected, confidence }
                                                     ▼
                         SuggestionBar  →  Tab: apply edit  /  Esc: dismiss
```

### 2.1 Files

| File | Role |
|---|---|
| `src/assist/types.ts` | `DecisionEngine`, `Decision`, `Suggestion`, `passesGate`, `softmax`, `toDecision` |
| `src/assist/questions.ts` | Stable question ids (`Q`), model prompts, option sets (languages, paste kinds, readability scale) |
| `src/assist/prefilter.ts` | Deterministic candidate detection — fence-aware line splitting, bare fences, structure candidates, `##` sections |
| `src/assist/heuristicEngine.ts` | `DecisionEngine` backed by `heuristics/*`, routed by question id |
| `src/assist/heuristics/*.ts` | Scorers: `language`, `paste`, `structure`, `readability` |
| `src/assist/features/*.ts` | F1–F4: turn decisions into `Suggestion`s / readability marks |
| `src/assist/convert.ts` | Deterministic converters (CSV/TSV/aligned text → table, list, code block) |
| `src/assist/layaEngine.ts` + `laya.worker.ts` | Worker client + worker for the Laya model (runtime not wired yet) |
| `src/assist/useSmartAssist.ts` | React hook: engine lifecycle, debouncing, cancellation, keyboard, paste, accept/dismiss |
| `src/components/SuggestionBar.tsx`, `AssistToggle.tsx` | UI |
| `scripts/eval-assist.ts` + `src/assist/__fixtures__/` | Offline evaluation |

### 2.2 The engine contract

```ts
interface DecisionEngine {
  readonly kind: 'heuristic' | 'model'
  ready(): Promise<void>
  choice<T extends string>(state: string, q: string, options: Record<T, string>): Promise<Decision<T>>
  score(state: string, q: string, scale: string[]): Promise<{ value: number; probs: number[] }>
  noul(state: string, statement: string): Promise<number>
}
```

Both engines implement the same interface, so features never know which one answered.
`q` is a stable id (e.g. `fence.language`); a model engine receives the matching
natural-language prompt from `PROMPTS`, while the heuristic engine uses it to pick a scorer.

### 2.3 The confidence gate

A suggestion is shown only when the engine is sure:

```ts
passesGate(probs, threshold = 0.8, minMargin = 0.2)
// top probability ≥ 0.8  AND  top − second ≥ 0.2
```

| Feature | Gate |
|---|---|
| F1 code fence, F2 smart paste | 0.8 / 0.2 |
| F3 structure (`noul`) | p ≥ 0.8 (implies margin 0.6 over "false") |
| F4 readability | 0.5 / 0.15 (it's a passive hint, not an edit) |

Silence is the default: a missed suggestion costs nothing, a wrong one costs trust.

### 2.4 Safety guarantees

- **Suggest-only.** Every `Suggestion` carries an `edit` (`from`, `to`, `insert`) and an
  `expected` string. On accept, the hook re-checks that `text.slice(from, to) === expected`;
  if the user has typed since, the stale suggestion is dropped.
- **Undo works.** Edits are applied with `document.execCommand('insertText')`, so they enter the
  browser's native undo stack (`⌘/Ctrl Z`); a controlled `onChange` is the fallback.
- **Never per keystroke.** Analysis is debounced (400 ms), readability waits for 2 s idle, and
  the pre-filter must find a candidate before any engine call.
- **Cancellation.** Each run owns an `AbortController`; new input aborts stale runs (and calls
  `LayaEngine.cancelAll()` for in-flight worker requests).
- **Dismissals stick** for the session (keyed by a content hash), so the same hint never nags.
- **Off means off.** With the mode set to *Off*, no handlers are attached to the textarea.

---

## 3. Features and their heuristics

### F1 — Code-fence language (`choice`)

**Trigger.** A *closed* fenced block (```` ``` ```` or `~~~`) with an empty info string, body ≥ 3
chars, and the cursor **outside** the block (you've finished writing it). The nearest such fence
is evaluated first (max 3 per run).

**Options.** 20 languages + `plaintext`: ts, js, python, bash, json, html, css, sql, go, rust,
java, c, cpp, csharp, ruby, php, yaml, markdown, diff, dockerfile.

**Heuristic** (`heuristics/language.ts`). Each language has weighted regex rules that behave like
logits — each matching rule adds its weight once:

- *Distinctive* evidence gets high weights (`package main` → Go +4, `<?php` → PHP +6,
  `if err != nil` → Go +4, `#!/bin/bash` → Bash +5, `@@ -1,2 +1,2 @@` → diff +5).
- *Shared* syntax (braces, `=>`, `import … from`) gets small weights across languages.
- *Negative* rules subtract contradicting evidence (e.g. TS type annotations penalise plain JS).
- *Structural overrides:* valid `JSON.parse` → json +6; TS vs JS is decided by TS-only evidence
  (type annotations, `interface`, `import type`, `as const`), since TS is a superset of JS.
- `plaintext` is scored from a **code-likeness** ratio (symbol density vs. words, minus sentence
  punctuation), so prose in any language (including pt-BR) stays untagged.

Scores go through `softmax` → probabilities → gate. **Action:** insert the language id right after
the opening fence marker.

### F2 — Smart paste (`choice`)

**Trigger.** A `paste` into the editor with ≥ 2 non-empty lines (≤ 50 k chars) that doesn't
already start as Markdown structure (tables, fences, headings, lists). **The paste always lands
untouched**; the suggestion offers to convert the pasted range afterwards.

**Options.** `prose | table | csv | tsv | list | code | json`.

**Heuristic** (`heuristics/paste.ts`):

| Kind | Evidence |
|---|---|
| `json` | `JSON.parse` succeeds on text starting with `{`/`[` (+8) |
| `tsv` | tab count identical on every line (+7) |
| `csv` | consistent comma-cell count (quote-aware), short cells; penalised by sentences and "wordy" cells (> 5 words) |
| `table` | column gutters (2+ spaces) shared by every line — terminal / `kubectl`-style output |
| `list` | bullet markers (`•`, `–`, `1)`, `a.`…) or ≥ 3 short lines without terminal punctuation |
| `code` | reuses F1 language scores + structural code shape (lines ending in `{ } ;`, indentation) |
| `prose` | lines with sentence punctuation and ≥ 8 words |

**Action** (`convert.ts`): CSV/TSV/aligned → GFM table (first row = header, `|` escaped); list →
`- item` (existing bullets normalised); JSON → ```` ```json ````; code → fenced block, tagged with
the F1 language only if *that* decision also passes the gate. `prose` never suggests anything.

### F3 — Structure intent (`noul`)

**Trigger.** Near-miss Markdown on a line that is **not** the one being typed:

| Candidate | Fix |
|---|---|
| `**Title**` alone on a line after a blank line | `## Title` |
| `#Heading` (no space) — but not `#tag` single words or `#fff` colours | `# Heading` |
| `== Title ==` (wiki style) | heading, level from the `=` count |
| `-item`, `*item`, `+item` | `- item` |
| `1)item`, `1.item` | `1) item` |

**Heuristic** (`heuristics/structure.ts`). The engine gets the ±2 lines of context and a statement
such as *"The line "**Installation**" is meant to be a section heading."*. The probability starts
from a per-kind prior and is adjusted by evidence: long bold lines or lines ending in `.`/`!`/`?`
are emphasis, not headings; `-5 degrees` is a negative number; `*word*` is emphasis; neighbouring
list items raise confidence for list fixes.

### F4 — Readability (`score`)

**Trigger.** 2 s idle; one decision per `##` section with ≥ 30 words.

**Heuristic** (`heuristics/readability.ts`). **LIX**, chosen because it is language-agnostic
(works for English and Portuguese, unlike Flesch variants tuned to English syllables):

```
LIX = words / sentences + 100 × longWords / words      (long = more than 6 letters)
```

Markdown is stripped first (code, links, tables; list items and headings count as sentences).
The value is mapped onto a 5-step scale — *very easy · easy · moderate · hard · very hard*
(bucket centres 25/35/45/55/65) — with a sharpness that grows with section length, so short
sections produce flat distributions and stay silent.

**Action.** A small coloured dot next to the section's heading in the preview, with a tooltip.
Marks are only re-rendered when a score actually changes.

---

## 4. Laya

### 4.1 What it is

**Laya** is an open-weights decision model (Apache-2.0; ~322 M multilingual and ~421 M parameter
variants with ONNX exports) that natively answers `choice` / `score` / `noul` questions — the
exact contract above. Its closed-source counterpart, **Jev**, is a hosted API and is *not* used:
calling a hosted model would break the product's "files never leave your machine" promise.

Laya is meant to be an **upgrade over the heuristics, not a dependency**: the app must be fully
useful without it, and it only replaces heuristics for a feature where the eval shows a
meaningful win.

### 4.2 How it plugs in

```
useSmartAssist ──► LayaEngine (main thread) ──postMessage──► laya.worker.ts (Web Worker)
                     │  id-tagged requests                      │  load → WebGPU, else WASM
                     │  cancelAll() on new input                │  choice / score / noul
                     ◄──────────── { id, ok, result } / progress ┘
```

- **Worker-only inference** — the UI thread never runs the model.
- **Protocol:** `{ id, op: 'load' | 'choice' | 'score' | 'noul' | 'cancel', payload }` →
  `{ id, ok, result | error }`, plus `{ op: 'progress', loaded, total }` during download.
- **Prompts:** the worker receives `PROMPTS[q]` (natural language) plus the option map / scale /
  statement, so the same feature code works for both engines.
- **Lifecycle:** selecting *Local model* starts the worker; heuristics answer while it loads; if
  `ready()` rejects, the hook reports `fallback` (amber dot on the Assist button) and keeps using
  heuristics.
- **Download policy (planned):** lazy, opt-in, with size + progress shown; cached by the browser
  so it works offline after the first load.

### 4.3 Current status

| Piece | State |
|---|---|
| `DecisionEngine` contract, prompts, gate | ✅ done |
| Worker client (`layaEngine.ts`) with cancellation + progress | ✅ done |
| Worker (`laya.worker.ts`) protocol | ✅ done |
| Model runtime inside `loadModel()` / `infer()` | ⏳ TODO |
| UI option "Local model" | disabled ("soon") until the runtime lands |

To wire it: implement `loadModel()` in `laya.worker.ts` (transformers.js or onnxruntime-web,
preferring WebGPU and falling back to WASM), return an object with
`infer(op, payload)`, then enable the `model` option in `AssistToggle.tsx`.

### 4.4 Before enabling it (open questions)

1. Which exact ONNX export to use and its JS runtime API (transformers.js vs raw onnxruntime-web).
2. Real download size and quantisation — reported sizes don't match the parameter counts, so
   measure before committing to a variant (prefer the 322 M multilingual one if quality holds).
3. Latency on WASM-only devices (no WebGPU).
4. **Calibration.** Laya has a documented failure mode of being *confidently wrong* on unfamiliar
   input; the gate assumes "0.9" means ~90 % correct. Verify with the eval (include pt-BR and
   mixed-language snippets) before trusting its probabilities.

---

## 5. Evaluation

```bash
npm run eval:assist
```

Runs every fixture through the engine and reports, per feature: argmax accuracy, how many
suggestions pass the gate, **precision when shown** (the number users actually feel), a
calibration table by confidence bucket, per-decision latency, and each miss.

| Feature | Fixtures | Accuracy | Shown | Precision when shown |
|---|---|---|---|---|
| F1 | 40 | 100 % | 27 | 100 % |
| F2 | 14 | 100 % | 10 | 100 % |
| F3 | 10 | 100 % | 6 | 100 % |

These fixtures were written alongside the heuristics, so the numbers are optimistic. Grow them
with real-world samples (target 60 / 30 / 30) — and add a Laya column — before comparing engines.

---

## 6. Extending Smart Assist

1. **Pre-filter** the candidate deterministically in `prefilter.ts` (pure, cheap).
2. Add a **question id** + prompt + option set in `questions.ts`.
3. Add a **heuristic scorer** in `heuristics/` and route it in `heuristicEngine.ts`.
4. Add a **feature** in `features/` returning a `Suggestion` with an `expected` guard and a gate.
5. Wire it in `useSmartAssist.ts` (debounced effect, paste handler or idle effect).
6. Add **fixtures** and extend `scripts/eval-assist.ts`.
7. Document it on the **About page** and in this file (both languages), and add its UI strings to `src/lib/locales/`.

Tuning tips: prefer adding a distinctive rule over raising a shared weight; when a fix makes one
fixture pass, re-run the whole eval — heuristics interact through softmax.
