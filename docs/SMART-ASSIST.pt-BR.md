# Smart Assist — Documentação técnica

O Smart Assist é o "radar de escrita" opcional e local do Marksage. Ele observa o
editor, detecta um pequeno conjunto de situações corrigíveis e **sugere** uma edição que você pode
aceitar (`Tab`) ou dispensar (`Esc`). Nada é enviado pela rede e nada é aplicado automaticamente.

> Origem do design e questões em aberto: `SMART-ASSIST — Implementation Context.md` (raiz do repositório).
> Convenções para contribuir: `AGENTS.md`. Versão em inglês: `docs/SMART-ASSIST.md`.

---

## 1. Por que "modelos de decisão"

O Smart Assist é construído sobre **modelos de decisão**, e não sobre modelos generativos. Um modelo
de decisão responde a uma *pergunta tipada sobre um conjunto de respostas definido de antemão*:

| Tipo de decisão | Formato da pergunta | Retorna |
|---|---|---|
| `choice` | "Qual destas opções?" | a opção escolhida + uma probabilidade por opção |
| `score` | "Em que ponto desta escala ordenada?" | um índice + uma probabilidade por degrau |
| `noul` | "Esta afirmação é verdadeira?" | uma probabilidade em `[0, 1]` |

Como o espaço de respostas é fechado, a saída nunca vem malformada. A regra do código:

> **O mecanismo decide; o nosso código TypeScript age.** Se não dá para listar as respostas
> possíveis de antemão, não é um trabalho para o Smart Assist.

Por isso o projeto evita, de propósito, autocompletar generativo, reescrita e "corretor ortográfico
com IA" (ferramentas determinísticas como `nspell`/`remark-lint` são as certas para isso).

---

## 2. Arquitetura

```
textarea ──(debounce 400 ms / colar / 2 s ocioso)──► prefilter.ts   "há um candidato?"
                                                       │  não → para (nenhuma chamada ao mecanismo)
                                                       ▼
                                                DecisionEngine
                                     ┌─────────────────┴─────────────────┐
                              HeuristicEngine                      LayaEngine
                         (sempre disponível, rápido)        (Web Worker, estruturado)
                                     └─────────────────┬─────────────────┘
                                                       ▼
                                      filtro de confiança (passesGate)
                                                       ▼
                                Suggestion { edit, expected, confidence }
                                                       ▼
                        SuggestionBar  →  Tab: aplica a edição  /  Esc: dispensa
```

### 2.1 Arquivos

| Arquivo | Papel |
|---|---|
| `src/assist/types.ts` | `DecisionEngine`, `Decision`, `Suggestion`, `passesGate`, `softmax`, `toDecision` |
| `src/assist/questions.ts` | Ids estáveis das perguntas (`Q`), prompts do modelo, conjuntos de opções |
| `src/assist/prefilter.ts` | Detecção determinística de candidatos — linhas cientes de blocos de código, blocos sem linguagem, candidatos de estrutura, seções `##` |
| `src/assist/heuristicEngine.ts` | `DecisionEngine` baseado em `heuristics/*`, roteado pelo id da pergunta |
| `src/assist/heuristics/*.ts` | Pontuadores: `language`, `paste`, `structure`, `readability` |
| `src/assist/features/*.ts` | F1–F4: transformam decisões em `Suggestion`s / marcas de legibilidade |
| `src/assist/convert.ts` | Conversores determinísticos (CSV/TSV/texto alinhado → tabela, lista, bloco de código) |
| `src/assist/layaEngine.ts` + `laya.worker.ts` | Cliente e worker do modelo Laya (runtime ainda não conectado) |
| `src/assist/useSmartAssist.ts` | Hook React: ciclo de vida do mecanismo, debounce, cancelamento, teclado, colagem |
| `src/components/SuggestionBar.tsx`, `AssistToggle.tsx` | Interface |
| `scripts/eval-assist.ts` + `src/assist/__fixtures__/` | Avaliação offline |

### 2.2 O contrato do mecanismo

```ts
interface DecisionEngine {
  readonly kind: 'heuristic' | 'model'
  ready(): Promise<void>
  choice<T extends string>(state: string, q: string, options: Record<T, string>): Promise<Decision<T>>
  score(state: string, q: string, scale: string[]): Promise<{ value: number; probs: number[] }>
  noul(state: string, statement: string): Promise<number>
}
```

Os dois mecanismos implementam a mesma interface, então os recursos nunca sabem quem respondeu.
`q` é um id estável (ex.: `fence.language`); um mecanismo de modelo recebe o prompt em linguagem
natural correspondente em `PROMPTS`, enquanto o heurístico usa o id para escolher o pontuador.

### 2.3 O filtro de confiança

Uma sugestão só aparece quando o mecanismo tem certeza:

```ts
passesGate(probs, threshold = 0.8, minMargin = 0.2)
// maior probabilidade ≥ 0,8  E  maior − segunda ≥ 0,2
```

| Recurso | Filtro |
|---|---|
| F1 bloco de código, F2 colagem inteligente | 0,8 / 0,2 |
| F3 estrutura (`noul`) | p ≥ 0,8 (implica margem de 0,6 sobre "falso") |
| F4 legibilidade | 0,5 / 0,15 (é uma dica passiva, não uma edição) |

O silêncio é o padrão: uma sugestão perdida não custa nada; uma errada custa confiança.

### 2.4 Garantias de segurança

- **Só sugere.** Toda `Suggestion` carrega uma `edit` (`from`, `to`, `insert`) e uma string
  `expected`. Ao aceitar, o hook confere se `text.slice(from, to) === expected`; se você digitou
  algo depois, a sugestão velha é descartada.
- **Desfazer funciona.** As edições usam `document.execCommand('insertText')`, então entram na
  pilha nativa de desfazer (`⌘/Ctrl Z`); um `onChange` controlado é o plano B.
- **Nunca a cada tecla.** A análise tem debounce (400 ms), a legibilidade espera 2 s ociosos e o
  pré-filtro precisa achar um candidato antes de qualquer chamada ao mecanismo.
- **Cancelamento.** Cada execução tem seu `AbortController`; novas digitações abortam execuções
  antigas (e chamam `LayaEngine.cancelAll()` para pedidos em andamento no worker).
- **Dispensas permanecem** durante a sessão (por hash do conteúdo), para a mesma dica não insistir.
- **Desligado é desligado.** No modo *Desligado*, nenhum handler é ligado ao textarea.

---

## 3. Recursos e suas heurísticas

### F1 — Linguagem do bloco de código (`choice`)

**Gatilho.** Um bloco *fechado* (```` ``` ```` ou `~~~`) sem linguagem, com corpo ≥ 3 caracteres,
e o cursor **fora** do bloco (você terminou de escrever). O bloco mais próximo é avaliado primeiro
(no máximo 3 por execução).

**Opções.** 20 linguagens + `plaintext`: ts, js, python, bash, json, html, css, sql, go, rust,
java, c, cpp, csharp, ruby, php, yaml, markdown, diff, dockerfile.

**Heurística** (`heuristics/language.ts`). Cada linguagem tem regras regex com pesos que funcionam
como logits — cada regra que casa soma seu peso uma vez:

- Evidências *distintivas* têm peso alto (`package main` → Go +4, `<?php` → PHP +6,
  `if err != nil` → Go +4, `#!/bin/bash` → Bash +5, `@@ -1,2 +1,2 @@` → diff +5).
- Sintaxe *compartilhada* (chaves, `=>`, `import … from`) tem peso pequeno em várias linguagens.
- Regras *negativas* subtraem evidências contraditórias (ex.: anotações de tipo TS penalizam JS).
- *Ajustes estruturais:* `JSON.parse` válido → json +6; TS vs JS é decidido por evidência exclusiva
  de TS (anotações de tipo, `interface`, `import type`, `as const`), já que TS é superconjunto de JS.
- `plaintext` é pontuado por uma **razão de "cara de código"** (densidade de símbolos vs. palavras,
  menos pontuação de frase), então prosa em qualquer idioma (inclusive pt-BR) fica sem tag.

As pontuações passam por `softmax` → probabilidades → filtro. **Ação:** inserir o id da linguagem
logo após o marcador de abertura.

### F2 — Colagem inteligente (`choice`)

**Gatilho.** Um `paste` no editor com ≥ 2 linhas não vazias (≤ 50 mil caracteres) que ainda não
comece como estrutura Markdown (tabelas, blocos, títulos, listas). **A colagem sempre entra
intacta**; a sugestão oferece converter o trecho colado depois.

**Opções.** `prose | table | csv | tsv | list | code | json`.

**Heurística** (`heuristics/paste.ts`):

| Tipo | Evidência |
|---|---|
| `json` | `JSON.parse` funciona em texto que começa com `{`/`[` (+8) |
| `tsv` | mesma quantidade de tabulações em todas as linhas (+7) |
| `csv` | quantidade consistente de células por vírgula (respeitando aspas), células curtas; penalizado por frases e células "longas" (> 5 palavras) |
| `table` | colunas separadas por 2+ espaços em todas as linhas — saída de terminal / estilo `kubectl` |
| `list` | marcadores (`•`, `–`, `1)`, `a.`…) ou ≥ 3 linhas curtas sem pontuação final |
| `code` | reaproveita as pontuações do F1 + formato de código (linhas terminando em `{ } ;`, indentação) |
| `prose` | linhas com pontuação de frase e ≥ 8 palavras |

**Ação** (`convert.ts`): CSV/TSV/alinhado → tabela GFM (primeira linha = cabeçalho, `|` escapado);
lista → `- item` (marcadores existentes normalizados); JSON → ```` ```json ````; código → bloco,
com a linguagem do F1 apenas se *essa* decisão também passar no filtro. `prose` nunca sugere nada.

### F3 — Intenção de estrutura (`noul`)

**Gatilho.** Markdown "quase certo" numa linha que **não** é a que está sendo digitada:

| Candidato | Correção |
|---|---|
| `**Título**` sozinho numa linha após uma linha em branco | `## Título` |
| `#Título` (sem espaço) — mas não `#tag` de uma palavra nem cores `#fff` | `# Título` |
| `== Título ==` (estilo wiki) | título, nível pela quantidade de `=` |
| `-item`, `*item`, `+item` | `- item` |
| `1)item`, `1.item` | `1) item` |

**Heurística** (`heuristics/structure.ts`). O mecanismo recebe ±2 linhas de contexto e uma
afirmação como *"A linha "**Instalação**" deveria ser um título de seção."*. A probabilidade parte
de um valor inicial por tipo e é ajustada pelas evidências: linhas em negrito longas ou terminadas
em `.`/`!`/`?` são ênfase, não título; `-5 graus` é um número negativo; `*palavra*` é ênfase; itens
de lista vizinhos aumentam a confiança nas correções de lista.

### F4 — Legibilidade (`score`)

**Gatilho.** 2 s ocioso; uma decisão por seção `##` com ≥ 30 palavras.

**Heurística** (`heuristics/readability.ts`). **LIX**, escolhido por ser independente de idioma
(funciona em português e inglês, ao contrário das variantes de Flesch ajustadas às sílabas do inglês):

```
LIX = palavras / frases + 100 × palavrasLongas / palavras      (longa = mais de 6 letras)
```

O Markdown é removido antes (código, links, tabelas; itens de lista e títulos contam como frases).
O valor é mapeado numa escala de 5 degraus — *muito fácil · fácil · moderada · difícil · muito
difícil* (centros 25/35/45/55/65) — com uma nitidez que cresce com o tamanho da seção, então seções
curtas geram distribuições planas e ficam em silêncio.

**Ação.** Um pontinho colorido ao lado do título da seção na pré-visualização, com dica ao passar
o mouse. As marcas só são redesenhadas quando uma pontuação muda de fato.

---

## 4. Laya

### 4.1 O que é

O **Laya** é um modelo de decisão com pesos abertos (Apache-2.0; variantes multilíngue de ~322 M e
de ~421 M de parâmetros, com exportações ONNX) que responde nativamente perguntas `choice` / `score`
/ `noul` — exatamente o contrato acima. Seu equivalente de código fechado, o **Jev**, é uma API
hospedada e *não* é usado: chamar um modelo hospedado quebraria a promessa de que "os arquivos
nunca saem da sua máquina".

O Laya deve ser uma **melhoria sobre as heurísticas, não uma dependência**: o app precisa ser
totalmente útil sem ele, e ele só substitui as heurísticas num recurso em que a avaliação mostrar
um ganho relevante.

### 4.2 Como ele se encaixa

```
useSmartAssist ──► LayaEngine (thread principal) ──postMessage──► laya.worker.ts (Web Worker)
                     │  pedidos com id                             │  carrega → WebGPU, senão WASM
                     │  cancelAll() a cada nova digitação          │  choice / score / noul
                     ◄──────────── { id, ok, result } / progresso ─┘
```

- **Inferência só no worker** — a thread da interface nunca roda o modelo.
- **Protocolo:** `{ id, op: 'load' | 'choice' | 'score' | 'noul' | 'cancel', payload }` →
  `{ id, ok, result | error }`, mais `{ op: 'progress', loaded, total }` durante o download.
- **Prompts:** o worker recebe `PROMPTS[q]` (linguagem natural) mais o mapa de opções / escala /
  afirmação, então o mesmo código de recurso funciona com os dois mecanismos.
- **Ciclo de vida:** escolher *Modelo local* inicia o worker; as heurísticas respondem enquanto ele
  carrega; se `ready()` falhar, o hook reporta `fallback` (ponto âmbar no botão Assist) e segue com
  as heurísticas.
- **Política de download (planejada):** preguiçosa, opcional, com tamanho e progresso visíveis;
  cache do navegador para funcionar offline após o primeiro carregamento.

### 4.3 Situação atual

| Peça | Estado |
|---|---|
| Contrato `DecisionEngine`, prompts, filtro | ✅ pronto |
| Cliente do worker (`layaEngine.ts`) com cancelamento e progresso | ✅ pronto |
| Protocolo do worker (`laya.worker.ts`) | ✅ pronto |
| Runtime do modelo em `loadModel()` / `infer()` | ⏳ a fazer |
| Opção "Modelo local" na interface | desativada ("em breve") até o runtime existir |

Para conectar: implemente `loadModel()` em `laya.worker.ts` (transformers.js ou onnxruntime-web,
preferindo WebGPU e caindo para WASM), retorne um objeto com `infer(op, payload)` e habilite a
opção `model` em `AssistToggle.tsx`.

### 4.4 Antes de ativar (questões em aberto)

1. Qual exportação ONNX usar e a API de runtime em JS (transformers.js vs onnxruntime-web puro).
2. Tamanho real do download e quantização — os tamanhos relatados não batem com a contagem de
   parâmetros, então meça antes de escolher uma variante (prefira a multilíngue de 322 M se a
   qualidade se mantiver).
3. Latência em dispositivos só com WASM (sem WebGPU).
4. **Calibração.** O Laya tem um modo de falha documentado de errar *com confiança* em entradas
   desconhecidas; o filtro assume que "0,9" significa ~90 % de acerto. Verifique com a avaliação
   (inclua trechos em pt-BR e em idiomas misturados) antes de confiar nas probabilidades.

---

## 5. Avaliação

```bash
npm run eval:assist
```

Roda todas as fixtures pelo mecanismo e reporta, por recurso: acurácia (argmax), quantas sugestões
passam no filtro, **precisão quando exibida** (o número que o usuário sente), uma tabela de
calibração por faixa de confiança, latência por decisão e cada erro.

| Recurso | Fixtures | Acurácia | Exibidas | Precisão quando exibida |
|---|---|---|---|---|
| F1 | 40 | 100 % | 27 | 100 % |
| F2 | 14 | 100 % | 10 | 100 % |
| F3 | 10 | 100 % | 6 | 100 % |

Essas fixtures foram escritas junto com as heurísticas, então os números são otimistas. Amplie-as
com amostras reais (meta 60 / 30 / 30) — e adicione uma coluna do Laya — antes de comparar mecanismos.

---

## 6. Estendendo o Smart Assist

1. **Pré-filtre** o candidato de forma determinística em `prefilter.ts` (puro e barato).
2. Adicione um **id de pergunta** + prompt + conjunto de opções em `questions.ts`.
3. Adicione um **pontuador heurístico** em `heuristics/` e roteie-o em `heuristicEngine.ts`.
4. Adicione um **recurso** em `features/` que retorne uma `Suggestion` com a guarda `expected` e um filtro.
5. Conecte-o em `useSmartAssist.ts` (efeito com debounce, handler de colagem ou efeito ocioso).
6. Adicione **fixtures** e estenda `scripts/eval-assist.ts`.
7. Documente no **About** e neste arquivo (nas duas línguas), e traduza as mensagens em `src/lib/locales/`.

Dicas de ajuste: prefira adicionar uma regra distintiva a aumentar um peso compartilhado; quando uma
correção fizer uma fixture passar, rode a avaliação inteira de novo — as heurísticas interagem via softmax.
