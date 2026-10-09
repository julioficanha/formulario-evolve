# ACEFB na sua visão — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um formulário web público, mobile-first, que aplica o questionário "ACEFB na sua visão" com desvios condicionais exatos e grava respostas numa Google Sheet via Apps Script.

**Architecture:** Página estática (HTML + CSS + JS vanilla ES modules) hospedada em GitHub Pages, enviando as respostas num único POST para um Google Apps Script Web App que faz `appendRow` numa Google Sheet. Zero build step, zero servidor, zero banco próprio.

**Tech Stack:** HTML5, CSS3, JavaScript ES modules (vanilla), Node 20+ (apenas para `node --test` em CI local), Google Apps Script (V8), Google Sheets, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-09-acefb-pesquisa-design.md`

## Global Constraints

- Textos de perguntas, descrições, opções e mensagem final **literais** do PDF `Questionario-2.pdf` — proibido parafrasear.
- Idioma: português brasileiro, charset UTF-8.
- Sem framework, sem build step, sem bundler. HTML/CSS/JS vão para o GitHub Pages como estão.
- Node 20+ apenas para `node --test` (não é dependência de runtime).
- Mobile-first; funcionar em celular sem conta Google e sem rede estável.
- Anonimato: zero cookies, zero analytics, zero logs de IP, zero terceiros fora Google (Pages/Sheets/Apps Script).
- Payload do browser: JSON plano `{"p1": "...", "p7": ["...", "..."]}`. Chaves ausentes = pergunta não visitada.
- Separador para arrays na Sheet: `" | "` (barra entre espaços).
- `timestamp_iso`: gerado no Apps Script em `America/Sao_Paulo`.
- Repo público em `github.com/<handle>/acefb-pesquisa`, branch `main`, GitHub Pages na raiz.

## Review Focus

Entradas e falhas implicadas pela spec que **nenhum teste de task cobre direto** e são as mais prováveis de machucar o respondente/pesquisador. Cada linha tem um teste adicionado à task que possui o código.

1. Marcar opção exclusiva ("Nenhum desses públicos" na p7) após já ter marcado uma não-exclusiva — a não-exclusiva deve ser desmarcada e a exclusiva assumir sozinha. _(Task 3)_
2. POST falha com rede caída — o respondente **ainda vê** a tela de encerramento, resposta vai para `localStorage` e é reenviada quando reconectar. _(Task 6)_
3. Respondente responde "Não" na p1 — payload final tem **apenas** `p1`, demais perguntas vão em branco na Sheet. _(Task 4)_
4. Arrays no payload (`p7`, `p12`) viram string `"A | B | C"` numa única célula da Sheet. _(Task 7)_
5. Retry do localStorage pode reenviar um POST que o servidor já aceitou (perda do ACK) — mitigação mínima: UUID por envio incluído no payload e na Sheet, para dedup manual se necessário. _(Task 6)_

---

## File Structure

```
/
├── index.html                    # Shell que carrega app.js como module
├── styles.css                    # Mobile-first, azul escuro + branco
├── app.js                        # Orchestrator (DOM + estado + render + submit)
├── src/
│   ├── perguntas.js              # Dados puros: 20 perguntas + regras de desvio + textos
│   ├── estado.js                 # Pure: proximaSecao(secaoAtual, respostas) → number|'fim'
│   ├── validacao.js              # Pure: regras compostas das p7 e p12
│   ├── render.js                 # DOM: renderSecao(secao, respostasExistentes) → HTMLElement
│   └── submit.js                 # fetch + localStorage retry (browser-only)
├── tests/
│   ├── perguntas.test.js         # Integridade da estrutura de dados
│   ├── estado.test.js            # Todas as transições do PDF
│   └── validacao.test.js         # p7/p12 edge cases
├── apps-script/
│   └── Code.gs                   # doPost(e) → appendRow
├── docs/
│   └── superpowers/{specs,plans}/...
├── .gitignore
├── package.json                  # "type": "module" + script test
└── README.md                     # Handoff para Evolve
```

---

## Task 1: Scaffold + perguntas.js com dados do PDF

**Files:**
- Create: `package.json`, `.gitignore`, `index.html`, `src/perguntas.js`, `tests/perguntas.test.js`

**Interfaces:**
- Consumes: nada
- Produces:
  - `export const perguntas: Array<Pergunta>` — array ordenado de 20 itens
  - `export const regrasDesvio: Array<Regra>` — tabela §5 do spec, em dados
  - `export const descricaoInicial: string`
  - `export const mensagemFinal: string`
  - `type Pergunta = { id: string, secao: number, texto: string, tipo: 'radio'|'checkbox'|'textarea'|'text', obrigatoria: boolean, descricao?: string, opcoes?: string[], maxEscolhas?: number, opcoesExclusivas?: string[] }`
  - `type Regra = { aposPergunta?: string, aposSecao?: number, resposta?: string|string[]|'*', vai: number|'fim' }`

- [ ] **Step 1: Criar `package.json`**

```json
{
  "name": "acefb-pesquisa",
  "version": "1.0.0",
  "type": "module",
  "private": true,
  "scripts": {
    "test": "node --test tests/"
  }
}
```

- [ ] **Step 2: Criar `.gitignore`**

```
node_modules/
.DS_Store
*.log
.env
```

- [ ] **Step 3: Escrever teste `tests/perguntas.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { perguntas, regrasDesvio, descricaoInicial, mensagemFinal } from '../src/perguntas.js';

test('existem 20 perguntas numeradas de p1 a p20', () => {
  assert.equal(perguntas.length, 20);
  perguntas.forEach((p, i) => assert.equal(p.id, `p${i + 1}`));
});

test('cada pergunta tem campos obrigatórios', () => {
  for (const p of perguntas) {
    assert.ok(p.texto && p.texto.length > 0, `${p.id} sem texto`);
    assert.ok(['radio', 'checkbox', 'textarea', 'text'].includes(p.tipo));
    assert.equal(typeof p.secao, 'number');
    assert.equal(typeof p.obrigatoria, 'boolean');
  }
});

test('p6 é a única opcional', () => {
  const opcionais = perguntas.filter(p => !p.obrigatoria);
  assert.equal(opcionais.length, 1);
  assert.equal(opcionais[0].id, 'p6');
});

test('p7 é checkbox com maxEscolhas 2 e opções exclusivas', () => {
  const p7 = perguntas.find(p => p.id === 'p7');
  assert.equal(p7.tipo, 'checkbox');
  assert.equal(p7.maxEscolhas, 2);
  assert.deepEqual(p7.opcoesExclusivas, ['Nenhum desses públicos.', 'Não sei dizer.']);
});

test('p12 é checkbox com maxEscolhas 3 e opções exclusivas', () => {
  const p12 = perguntas.find(p => p.id === 'p12');
  assert.equal(p12.tipo, 'checkbox');
  assert.equal(p12.maxEscolhas, 3);
  assert.deepEqual(p12.opcoesExclusivas, ['Apenas neste evento.', 'Não encontrei informações.', 'Não lembro.']);
});

test('regrasDesvio cobrem todas as perguntas de saída precoce', () => {
  const perguntasComDesvio = ['p1', 'p2', 'p3', 'p4', 'p18'];
  for (const id of perguntasComDesvio) {
    const regras = regrasDesvio.filter(r => r.aposPergunta === id);
    assert.ok(regras.length >= 2, `${id} precisa de pelo menos 2 regras`);
  }
});

test('descricaoInicial e mensagemFinal são strings não-vazias', () => {
  assert.ok(descricaoInicial.length > 50);
  assert.ok(mensagemFinal.length > 20);
});

test('spot-check: p1 tem o texto e opções literais do PDF', () => {
  const p1 = perguntas.find(p => p.id === 'p1');
  assert.equal(p1.texto, 'Você tem 18 anos ou mais e aceita participar voluntariamente desta pesquisa?');
  assert.deepEqual(p1.opcoes, [
    'Sim, tenho 18 anos ou mais e aceito participar.',
    'Não.',
  ]);
});

test('spot-check: mensagemFinal é literal do PDF', () => {
  assert.equal(mensagemFinal, 'Agradecemos sua disponibilidade. Esta pesquisa é anônima e não gera contato comercial.');
});
```

- [ ] **Step 4: Rodar teste para verificar que falha**

Run: `node --test tests/perguntas.test.js`
Expected: FAIL (módulo `../src/perguntas.js` não existe)

- [ ] **Step 5: Criar `src/perguntas.js` com dados LITERAIS do PDF**

Transcrever **sem reescrever** os textos do `Questionario-2.pdf`. Exemplo da p1 e p7; replicar o padrão para as 20:

```js
export const descricaoInicial = `Esta pesquisa é realizada pela Evolve para a ACEFB, para entender como as pessoas percebem a associação. A participação é voluntária e anônima. Não pedimos nome, contato ou identificação da empresa, e não haverá abordagem comercial.

Queremos conhecer sua opinião, mesmo que você não conheça a ACEFB. Você pode interromper a participação a qualquer momento. O preenchimento leva aproximadamente 3 a 4 minutos.`;

export const mensagemFinal = `Agradecemos sua disponibilidade. Esta pesquisa é anônima e não gera contato comercial.`;

export const perguntas = [
  {
    id: 'p1',
    secao: 1,
    texto: 'Você tem 18 anos ou mais e aceita participar voluntariamente desta pesquisa?',
    tipo: 'radio',
    obrigatoria: true,
    opcoes: [
      'Sim, tenho 18 anos ou mais e aceito participar.',
      'Não.',
    ],
  },
  // ... p2 a p6
  {
    id: 'p7',
    secao: 5,
    texto: 'Na sua percepção, quais públicos a ACEFB representa?',
    tipo: 'checkbox',
    obrigatoria: true,
    maxEscolhas: 2,
    descricao: 'Marque até duas opções. Se escolher "Nenhum desses públicos" ou "Não sei dizer", marque somente essa opção.',
    opcoes: [
      'Micro e pequenos empresários e autônomos.',
      'Médios e grandes empresários.',
      'Trabalhadores.',
      'A comunidade de Francisco Beltrão em geral.',
      'Nenhum desses públicos.',
      'Não sei dizer.',
    ],
    opcoesExclusivas: ['Nenhum desses públicos.', 'Não sei dizer.'],
  },
  // ... p8 a p20
];

export const regrasDesvio = [
  { aposPergunta: 'p1', resposta: 'Sim, tenho 18 anos ou mais e aceito participar.', vai: 2 },
  { aposPergunta: 'p1', resposta: 'Não.', vai: 'fim' },
  { aposPergunta: 'p2', resposta: 'Não.', vai: 3 },
  { aposPergunta: 'p2', resposta: ['Sim.', 'Não sei informar.'], vai: 'fim' },
  { aposPergunta: 'p3', resposta: 'Não.', vai: 4 },
  { aposPergunta: 'p3', resposta: 'Sim.', vai: 'fim' },
  { aposPergunta: 'p4', resposta: ['Sim, e sei um pouco sobre o que ela faz.', 'Sim, mas conheço apenas o nome.'], vai: 5 },
  { aposPergunta: 'p4', resposta: ['Não.', 'Não lembro.'], vai: 6 },
  { aposSecao: 5, resposta: '*', vai: 6 },
  { aposPergunta: 'p18', resposta: 'Sim.', vai: 7 },
  { aposPergunta: 'p18', resposta: ['Não.', 'Prefiro não responder.'], vai: 'fim' },
  { aposSecao: 7, resposta: '*', vai: 'fim' },
];
```

Transcrever **todas as 20 perguntas** com os textos exatos dos PDFs. Validar visualmente contra `Questionario-2.pdf`.

- [ ] **Step 6: Criar `index.html` shell**

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="robots" content="noindex, nofollow" />
  <title>ACEFB na sua visão</title>
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <main id="app" aria-live="polite"></main>
  <script type="module" src="app.js"></script>
</body>
</html>
```

- [ ] **Step 7: Rodar teste para verificar que passa**

Run: `node --test tests/perguntas.test.js`
Expected: PASS em todos os 7 testes

- [ ] **Step 8: Inicializar git e commit**

```bash
git init
git add package.json .gitignore index.html src/ tests/
git commit -m "feat: scaffold + dados do questionário com testes de integridade"
```

---

## Task 2: Máquina de estados (branching)

**Files:**
- Create: `src/estado.js`, `tests/estado.test.js`

**Interfaces:**
- Consumes: `regrasDesvio`, `perguntas` de `src/perguntas.js`
- Produces:
  - `export function proximaSecao(secaoAtual: number, respostas: Record<string, string|string[]>): number | 'fim'`
  - `export function perguntasDaSecao(secao: number): Pergunta[]`

- [ ] **Step 1: Escrever `tests/estado.test.js` com todos os caminhos do PDF**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proximaSecao, perguntasDaSecao } from '../src/estado.js';

test('p1 Sim → seção 2', () => {
  assert.equal(proximaSecao(1, { p1: 'Sim, tenho 18 anos ou mais e aceito participar.' }), 2);
});

test('p1 Não → fim', () => {
  assert.equal(proximaSecao(1, { p1: 'Não.' }), 'fim');
});

test('p2 Não → seção 3', () => {
  assert.equal(proximaSecao(2, { p1: 'Sim, tenho 18 anos ou mais e aceito participar.', p2: 'Não.' }), 3);
});

test('p2 Sim → fim', () => {
  assert.equal(proximaSecao(2, { p2: 'Sim.' }), 'fim');
});

test('p2 Não sei informar → fim', () => {
  assert.equal(proximaSecao(2, { p2: 'Não sei informar.' }), 'fim');
});

test('p3 Não → seção 4', () => {
  assert.equal(proximaSecao(3, { p3: 'Não.' }), 4);
});

test('p3 Sim → fim', () => {
  assert.equal(proximaSecao(3, { p3: 'Sim.' }), 'fim');
});

test('p4 Sim variantes → seção 5', () => {
  assert.equal(proximaSecao(4, { p4: 'Sim, e sei um pouco sobre o que ela faz.' }), 5);
  assert.equal(proximaSecao(4, { p4: 'Sim, mas conheço apenas o nome.' }), 5);
});

test('p4 Não/Não lembro → seção 6', () => {
  assert.equal(proximaSecao(4, { p4: 'Não.' }), 6);
  assert.equal(proximaSecao(4, { p4: 'Não lembro.' }), 6);
});

test('fim da seção 5 → seção 6 (não repete 5)', () => {
  assert.equal(proximaSecao(5, { p4: 'Sim, e sei um pouco sobre o que ela faz.', p12: ['Instagram, Facebook ou outras redes sociais.'] }), 6);
});

test('fim da seção 6 → seção 7 se p18 Sim', () => {
  assert.equal(proximaSecao(6, { p18: 'Sim.' }), 7);
});

test('fim da seção 6 → fim se p18 Não ou Prefiro não responder', () => {
  assert.equal(proximaSecao(6, { p18: 'Não.' }), 'fim');
  assert.equal(proximaSecao(6, { p18: 'Prefiro não responder.' }), 'fim');
});

test('fim da seção 7 → fim', () => {
  assert.equal(proximaSecao(7, { p19: 'Com certeza procuraria.', p20: 'Falta de tempo.' }), 'fim');
});

test('perguntasDaSecao(1) retorna só p1', () => {
  const ps = perguntasDaSecao(1);
  assert.equal(ps.length, 1);
  assert.equal(ps[0].id, 'p1');
});

test('perguntasDaSecao(5) retorna p5 a p12 em ordem', () => {
  const ps = perguntasDaSecao(5);
  assert.deepEqual(ps.map(p => p.id), ['p5', 'p6', 'p7', 'p8', 'p9', 'p10', 'p11', 'p12']);
});
```

- [ ] **Step 2: Rodar teste para ver falhar**

Run: `node --test tests/estado.test.js`
Expected: FAIL (módulo não existe)

- [ ] **Step 3: Implementar `src/estado.js`**

```js
import { perguntas, regrasDesvio } from './perguntas.js';

export function perguntasDaSecao(secao) {
  return perguntas.filter(p => p.secao === secao);
}

function respostaBate(regra, resposta) {
  if (regra.resposta === '*') return true;
  if (Array.isArray(regra.resposta)) return regra.resposta.includes(resposta);
  return regra.resposta === resposta;
}

export function proximaSecao(secaoAtual, respostas) {
  const perguntasSecao = perguntasDaSecao(secaoAtual);
  // Regras baseadas na última pergunta respondida da seção
  for (let i = perguntasSecao.length - 1; i >= 0; i--) {
    const p = perguntasSecao[i];
    const resp = respostas[p.id];
    if (resp === undefined) continue;
    const regra = regrasDesvio.find(r => r.aposPergunta === p.id && respostaBate(r, resp));
    if (regra) return regra.vai;
  }
  // Senão, regra de fim-de-seção
  const regraFim = regrasDesvio.find(r => r.aposSecao === secaoAtual);
  if (regraFim) return regraFim.vai;
  return secaoAtual + 1;
}
```

- [ ] **Step 4: Rodar teste para ver passar**

Run: `node --test tests/estado.test.js`
Expected: PASS em todos os testes de transição

- [ ] **Step 5: Commit**

```bash
git add src/estado.js tests/estado.test.js
git commit -m "feat: máquina de estados do branching com testes para todos os caminhos"
```

---

## Task 3: Validações compostas (p7 e p12)

**Files:**
- Create: `src/validacao.js`, `tests/validacao.test.js`

**Interfaces:**
- Consumes: `perguntas` de `src/perguntas.js`
- Produces:
  - `export function aplicarRegrasExclusividade(pergunta, selecaoAtual: string[], acabouDeMarcar: string): string[]` — retorna seleção corrigida depois de aplicar regras
  - `export function validarResposta(pergunta, resposta): { ok: boolean, erro?: string }`

- [ ] **Step 1: Escrever `tests/validacao.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aplicarRegrasExclusividade, validarResposta } from '../src/validacao.js';
import { perguntas } from '../src/perguntas.js';

const p7 = perguntas.find(p => p.id === 'p7');
const p12 = perguntas.find(p => p.id === 'p12');

test('p7: marcar exclusiva remove não-exclusivas', () => {
  const resultado = aplicarRegrasExclusividade(
    p7,
    ['Micro e pequenos empresários e autônomos.', 'Trabalhadores.'],
    'Nenhum desses públicos.'
  );
  assert.deepEqual(resultado, ['Nenhum desses públicos.']);
});

test('p7: marcar não-exclusiva com exclusiva presente remove exclusiva', () => {
  const resultado = aplicarRegrasExclusividade(
    p7,
    ['Nenhum desses públicos.'],
    'Trabalhadores.'
  );
  assert.deepEqual(resultado, ['Trabalhadores.']);
});

test('p7: ultrapassar 2 escolhas remove a mais antiga', () => {
  const resultado = aplicarRegrasExclusividade(
    p7,
    ['Micro e pequenos empresários e autônomos.', 'Trabalhadores.'],
    'Médios e grandes empresários.'
  );
  assert.equal(resultado.length, 2);
  assert.ok(resultado.includes('Médios e grandes empresários.'));
  assert.ok(resultado.includes('Trabalhadores.'));
  assert.ok(!resultado.includes('Micro e pequenos empresários e autônomos.'));
});

test('p12: três exclusivas são realmente mutuamente exclusivas entre si', () => {
  const resultado = aplicarRegrasExclusividade(
    p12,
    ['Apenas neste evento.'],
    'Não lembro.'
  );
  assert.deepEqual(resultado, ['Não lembro.']);
});

test('validarResposta: obrigatória vazia falha', () => {
  const { ok, erro } = validarResposta(perguntas.find(p => p.id === 'p1'), undefined);
  assert.equal(ok, false);
  assert.ok(erro);
});

test('validarResposta: p6 vazia passa (opcional)', () => {
  const { ok } = validarResposta(perguntas.find(p => p.id === 'p6'), '');
  assert.equal(ok, true);
});

test('validarResposta: checkbox vazia obrigatória falha', () => {
  const { ok } = validarResposta(p7, []);
  assert.equal(ok, false);
});
```

- [ ] **Step 2: Rodar teste para ver falhar**

Run: `node --test tests/validacao.test.js`
Expected: FAIL

- [ ] **Step 3: Implementar `src/validacao.js`**

```js
export function aplicarRegrasExclusividade(pergunta, selecaoAtual, acabouDeMarcar) {
  const exclusivas = pergunta.opcoesExclusivas || [];
  const marcouExclusiva = exclusivas.includes(acabouDeMarcar);

  let nova = [...selecaoAtual];
  if (!nova.includes(acabouDeMarcar)) nova.push(acabouDeMarcar);

  if (marcouExclusiva) {
    nova = [acabouDeMarcar];
  } else {
    nova = nova.filter(o => !exclusivas.includes(o));
    if (nova.length > pergunta.maxEscolhas) {
      // remove a mais antiga que não é a recém-marcada
      const idx = nova.findIndex(o => o !== acabouDeMarcar);
      nova.splice(idx, 1);
    }
  }
  return nova;
}

export function validarResposta(pergunta, resposta) {
  if (!pergunta.obrigatoria) return { ok: true };

  if (pergunta.tipo === 'checkbox') {
    if (!Array.isArray(resposta) || resposta.length === 0) {
      return { ok: false, erro: 'Marque pelo menos uma opção.' };
    }
    return { ok: true };
  }

  if (resposta === undefined || resposta === null || String(resposta).trim() === '') {
    return { ok: false, erro: 'Esta pergunta é obrigatória.' };
  }
  return { ok: true };
}
```

- [ ] **Step 4: Rodar teste para ver passar**

Run: `node --test tests/validacao.test.js`
Expected: PASS em todos os testes

- [ ] **Step 5: Commit**

```bash
git add src/validacao.js tests/validacao.test.js
git commit -m "feat: regras de exclusividade e validação de obrigatoriedade"
```

---

## Task 4: Renderização de seções no DOM

**Files:**
- Create: `src/render.js`
- Modify: `app.js` (novo arquivo a criar aqui)

**Interfaces:**
- Consumes: `perguntasDaSecao` de `src/estado.js`, `aplicarRegrasExclusividade` de `src/validacao.js`
- Produces:
  - `export function renderSecao(secao: number, respostas: Record<string, any>, onChange: (perguntaId, novoValor) => void): HTMLElement`
  - `export function renderInicio(descricao: string): HTMLElement`
  - `export function renderFim(mensagem: string): HTMLElement`

- [ ] **Step 1: Criar `src/render.js`**

```js
import { perguntasDaSecao } from './estado.js';
import { aplicarRegrasExclusividade } from './validacao.js';

export function renderInicio(descricao) {
  const el = document.createElement('section');
  el.className = 'tela tela-inicio';
  el.innerHTML = `
    <h1>ACEFB na sua visão</h1>
    <p class="subtitulo">Percepções sobre a ACEFB</p>
    <div class="descricao">${descricao.split('\n\n').map(p => `<p>${p}</p>`).join('')}</div>
  `;
  return el;
}

export function renderFim(mensagem) {
  const el = document.createElement('section');
  el.className = 'tela tela-fim';
  el.innerHTML = `<h2>Obrigado</h2><p>${mensagem}</p>`;
  return el;
}

export function renderSecao(secao, respostas, onChange) {
  const el = document.createElement('section');
  el.className = 'tela tela-secao';
  el.dataset.secao = secao;

  const perguntas = perguntasDaSecao(secao);
  for (const p of perguntas) {
    el.appendChild(renderPergunta(p, respostas[p.id], onChange));
  }
  return el;
}

function renderPergunta(pergunta, valorAtual, onChange) {
  const div = document.createElement('div');
  div.className = 'pergunta';
  div.dataset.id = pergunta.id;

  const label = document.createElement('label');
  label.className = 'pergunta-texto';
  label.textContent = pergunta.texto;
  div.appendChild(label);

  if (pergunta.descricao) {
    const desc = document.createElement('p');
    desc.className = 'pergunta-descricao';
    desc.textContent = pergunta.descricao;
    div.appendChild(desc);
  }

  switch (pergunta.tipo) {
    case 'radio': div.appendChild(renderRadio(pergunta, valorAtual, onChange)); break;
    case 'checkbox': div.appendChild(renderCheckbox(pergunta, valorAtual || [], onChange)); break;
    case 'textarea': div.appendChild(renderTextarea(pergunta, valorAtual || '', onChange)); break;
    case 'text': div.appendChild(renderText(pergunta, valorAtual || '', onChange)); break;
  }

  const erro = document.createElement('p');
  erro.className = 'erro';
  erro.dataset.erroPara = pergunta.id;
  div.appendChild(erro);

  return div;
}

function renderRadio(pergunta, valor, onChange) {
  const fieldset = document.createElement('fieldset');
  for (const opcao of pergunta.opcoes) {
    const id = `${pergunta.id}-${slug(opcao)}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'opcao';
    wrapper.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'radio';
    input.name = pergunta.id;
    input.id = id;
    input.value = opcao;
    if (valor === opcao) input.checked = true;
    input.addEventListener('change', () => onChange(pergunta.id, opcao));
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(' ' + opcao));
    fieldset.appendChild(wrapper);
  }
  return fieldset;
}

function renderCheckbox(pergunta, valorAtual, onChange) {
  const fieldset = document.createElement('fieldset');
  for (const opcao of pergunta.opcoes) {
    const id = `${pergunta.id}-${slug(opcao)}`;
    const wrapper = document.createElement('label');
    wrapper.className = 'opcao';
    wrapper.htmlFor = id;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.id = id;
    input.value = opcao;
    if (valorAtual.includes(opcao)) input.checked = true;
    input.addEventListener('change', (e) => {
      let novaSelecao;
      if (e.target.checked) {
        novaSelecao = aplicarRegrasExclusividade(pergunta, valorAtual, opcao);
      } else {
        novaSelecao = valorAtual.filter(o => o !== opcao);
      }
      onChange(pergunta.id, novaSelecao);
    });
    wrapper.appendChild(input);
    wrapper.appendChild(document.createTextNode(' ' + opcao));
    fieldset.appendChild(wrapper);
  }
  return fieldset;
}

function renderTextarea(pergunta, valor, onChange) {
  const t = document.createElement('textarea');
  t.rows = 4;
  t.value = valor;
  t.addEventListener('input', () => onChange(pergunta.id, t.value));
  return t;
}

function renderText(pergunta, valor, onChange) {
  const i = document.createElement('input');
  i.type = 'text';
  i.value = valor;
  i.addEventListener('input', () => onChange(pergunta.id, i.value));
  return i;
}

function slug(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036F]/g, '').replace(/[^a-z0-9]+/g, '-').slice(0, 40);
}
```

- [ ] **Step 2: Review Focus item 3 — payload de saída precoce**

Adicionar teste em `tests/estado.test.js`:

```js
test('Review Focus 3: p1 Não deixa apenas p1 preenchida — demais perguntas ausentes', () => {
  const respostas = { p1: 'Não.' };
  const prox = proximaSecao(1, respostas);
  assert.equal(prox, 'fim');
  // nenhuma outra chave deve ser inferida ou preenchida a partir daqui
  assert.deepEqual(Object.keys(respostas), ['p1']);
});
```

Rodar: `node --test tests/estado.test.js` → PASS.

- [ ] **Step 3: Commit**

```bash
git add src/render.js tests/estado.test.js
git commit -m "feat: renderização DOM por tipo de pergunta + regras compostas no handler de checkbox"
```

---

## Task 5: Orchestrator (`app.js`) + CSS mobile-first

**Files:**
- Create: `app.js`, `styles.css`

**Interfaces:**
- Consumes: `renderInicio`, `renderSecao`, `renderFim` de `src/render.js`; `proximaSecao` de `src/estado.js`; `validarResposta` de `src/validacao.js`; `perguntas` de `src/perguntas.js`; `enviarRespostas` de `src/submit.js` (criado na Task 6 — por enquanto, stub)
- Produces: comportamento end-to-end da página

- [ ] **Step 1: Criar `app.js`**

```js
import { descricaoInicial, mensagemFinal, perguntas } from './src/perguntas.js';
import { renderInicio, renderSecao, renderFim } from './src/render.js';
import { proximaSecao, perguntasDaSecao } from './src/estado.js';
import { validarResposta } from './src/validacao.js';
import { enviarRespostas } from './src/submit.js';

const estado = {
  tela: 'inicio',       // 'inicio' | number (secao) | 'fim'
  secaoAtual: 0,
  respostas: {},
};

const appEl = document.getElementById('app');

function render() {
  appEl.innerHTML = '';
  appEl.appendChild(renderProgresso());

  if (estado.tela === 'inicio') {
    appEl.appendChild(renderInicio(descricaoInicial));
    appEl.appendChild(botao('Começar', iniciar));
  } else if (estado.tela === 'fim') {
    appEl.appendChild(renderFim(mensagemFinal));
  } else {
    appEl.appendChild(renderSecao(estado.tela, estado.respostas, onChangeResposta));
    appEl.appendChild(botao('Próxima', avancar));
  }
}

function renderProgresso() {
  const bar = document.createElement('div');
  bar.className = 'progresso';
  const atual = typeof estado.tela === 'number' ? estado.tela : (estado.tela === 'fim' ? 7 : 0);
  const pct = Math.round(((atual - 1) / 7) * 100);
  bar.innerHTML = `<div class="progresso-fill" style="width:${Math.max(0, pct)}%"></div>`;
  return bar;
}

function botao(label, onClick) {
  const b = document.createElement('button');
  b.className = 'botao-principal';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function onChangeResposta(perguntaId, valor) {
  estado.respostas[perguntaId] = valor;
  // Limpa mensagem de erro, se houver
  const erroEl = appEl.querySelector(`[data-erro-para="${perguntaId}"]`);
  if (erroEl) erroEl.textContent = '';
}

function iniciar() {
  estado.tela = 1;
  render();
}

function avancar() {
  const secao = estado.tela;
  const perguntasSecao = perguntasDaSecao(secao);
  let primeiroErro = null;
  for (const p of perguntasSecao) {
    const { ok, erro } = validarResposta(p, estado.respostas[p.id]);
    if (!ok) {
      const erroEl = appEl.querySelector(`[data-erro-para="${p.id}"]`);
      if (erroEl) erroEl.textContent = erro;
      if (!primeiroErro) primeiroErro = p.id;
    }
  }
  if (primeiroErro) {
    const el = appEl.querySelector(`[data-id="${primeiroErro}"]`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const prox = proximaSecao(secao, estado.respostas);
  if (prox === 'fim') {
    finalizar();
  } else {
    estado.tela = prox;
    render();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

async function finalizar() {
  estado.tela = 'fim';
  render();
  enviarRespostas(estado.respostas);  // fire-and-forget: tela final já apareceu
}

render();
```

- [ ] **Step 2: Criar `styles.css` mobile-first**

```css
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; color: #0b1b2b; background: #f4f6fa; }
body { line-height: 1.5; }
#app { max-width: 640px; margin: 0 auto; padding: 16px; }
h1 { font-size: 1.6rem; margin: 0 0 4px; color: #0b2a4a; }
.subtitulo { color: #4a5a70; margin: 0 0 16px; }
.descricao p { margin: 0 0 12px; }
.progresso { background: #e2e7ef; height: 6px; border-radius: 3px; margin-bottom: 16px; overflow: hidden; }
.progresso-fill { background: #0b2a4a; height: 100%; transition: width 0.3s ease; }
.pergunta { background: #fff; border-radius: 10px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.pergunta-texto { display: block; font-weight: 600; margin-bottom: 8px; }
.pergunta-descricao { font-size: 0.9rem; color: #4a5a70; margin: 0 0 10px; }
fieldset { border: none; padding: 0; margin: 0; }
.opcao { display: flex; align-items: flex-start; gap: 8px; padding: 10px 8px; border-radius: 6px; cursor: pointer; }
.opcao:hover { background: #f0f3f8; }
.opcao input { margin-top: 3px; }
textarea, input[type="text"] { width: 100%; padding: 10px; border: 1px solid #cbd3df; border-radius: 6px; font: inherit; }
textarea:focus, input:focus { outline: 2px solid #0b2a4a; outline-offset: 2px; }
.erro { color: #b00020; font-size: 0.9rem; margin: 6px 0 0; min-height: 1em; }
.botao-principal { display: block; width: 100%; padding: 14px; background: #0b2a4a; color: #fff; border: none; border-radius: 8px; font-size: 1rem; font-weight: 600; cursor: pointer; margin-top: 16px; }
.botao-principal:hover { background: #143c66; }
.tela-fim { text-align: center; padding: 40px 20px; }
@media (min-width: 720px) { #app { padding: 24px; } .pergunta { padding: 20px; } }
```

- [ ] **Step 3: Stub `src/submit.js` para a Task 4 fechar**

```js
export async function enviarRespostas(respostas) {
  console.log('[submit stub] respostas:', respostas);
}
```

- [ ] **Step 4: Teste manual no browser**

Abrir `index.html` localmente (ex.: `python3 -m http.server 8000` + `http://localhost:8000`). Percorrer:
- Caminho curto: p1 "Não" → tela final
- Caminho médio: p1 Sim → p2 Não → p3 Não → p4 "Não." → seção 6 → p18 "Não." → fim
- Caminho longo: p1 Sim → p2 Não → p3 Não → p4 "Sim, e sei um pouco..." → seção 5 (p5–p12) → seção 6 → p18 Sim → seção 7 (p19, p20) → fim
- Validar p7 com 3 marcações (deve bloquear ou substituir)
- Validar p7 marcando "Nenhum desses públicos" após ter marcado outras
- Deixar p5 em branco e tentar avançar (deve bloquear com mensagem de erro)

- [ ] **Step 5: Commit**

```bash
git add app.js styles.css src/submit.js
git commit -m "feat: orchestrator + CSS mobile-first + stub de submit"
```

---

## Task 6: Submit real + localStorage fallback

**Files:**
- Modify: `src/submit.js`
- Create: `tests/submit.test.js`

**Interfaces:**
- Consumes: fetch global, `localStorage` global
- Produces:
  - `export async function enviarRespostas(respostas: Record<string, any>): Promise<void>`
  - `export const APPS_SCRIPT_URL: string` (constante, preenchida na Task 8)

- [ ] **Step 1: Escrever `tests/submit.test.js`** (mock de fetch e localStorage)

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializar, gerarUuid, enfileirarRetry, drenarFila } from '../src/submit.js';

test('serializar: respostas simples', () => {
  const payload = serializar({ p1: 'Sim.', p7: ['A', 'B'] });
  const obj = JSON.parse(payload);
  assert.equal(obj.p1, 'Sim.');
  assert.deepEqual(obj.p7, ['A', 'B']);
  assert.ok(typeof obj.uuid === 'string');
  assert.ok(obj.uuid.length >= 10);
});

test('gerarUuid: formato', () => {
  const u = gerarUuid();
  assert.match(u, /^[a-f0-9-]{36}$/);
});

test('enfileirar e drenar: fila em memória simulando localStorage', () => {
  const store = new Map();
  const ls = {
    setItem: (k, v) => store.set(k, v),
    getItem: (k) => store.get(k) ?? null,
    removeItem: (k) => store.delete(k),
    key: (i) => [...store.keys()][i],
    get length() { return store.size; },
  };
  enfileirarRetry(ls, 'uuid-1', '{"p1":"Sim."}');
  assert.equal(store.size, 1);
  const items = drenarFila(ls);
  assert.equal(items.length, 1);
  assert.equal(items[0].uuid, 'uuid-1');
});
```

- [ ] **Step 2: Rodar — espera FAIL**

Run: `node --test tests/submit.test.js`
Expected: FAIL (funções não exportadas ainda)

- [ ] **Step 3: Implementar `src/submit.js`**

```js
export const APPS_SCRIPT_URL = 'TROQUE_PELA_URL_DO_APPS_SCRIPT_WEB_APP';

const PREFIXO_FILA = 'acefb-resposta-pendente-';

export function gerarUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function serializar(respostas, uuid = gerarUuid()) {
  return JSON.stringify({ uuid, ...respostas });
}

export function enfileirarRetry(ls, uuid, payload) {
  ls.setItem(PREFIXO_FILA + uuid, payload);
}

export function drenarFila(ls) {
  const itens = [];
  for (let i = 0; i < ls.length; i++) {
    const k = ls.key(i);
    if (k && k.startsWith(PREFIXO_FILA)) {
      itens.push({ uuid: k.slice(PREFIXO_FILA.length), payload: ls.getItem(k) });
    }
  }
  return itens;
}

async function postar(payload) {
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // evita preflight CORS no Apps Script
    body: payload,
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp;
}

export async function enviarRespostas(respostas) {
  const uuid = gerarUuid();
  const payload = serializar(respostas, uuid);
  try {
    await postar(payload);
  } catch {
    enfileirarRetry(localStorage, uuid, payload);
    agendarRetry();
  }
  tentarDrenar();
}

let timer = null;
function agendarRetry() {
  if (timer) return;
  timer = setInterval(tentarDrenar, 15000);
}

async function tentarDrenar() {
  if (typeof localStorage === 'undefined') return;
  const itens = drenarFila(localStorage);
  for (const { uuid, payload } of itens) {
    try {
      await postar(payload);
      localStorage.removeItem(PREFIXO_FILA + uuid);
    } catch {
      return; // ainda sem rede; tenta de novo no próximo tick
    }
  }
  if (drenarFila(localStorage).length === 0 && timer) {
    clearInterval(timer); timer = null;
  }
}
```

- [ ] **Step 4: Review Focus items 2 e 5**

Adicionar em `tests/submit.test.js`:

```js
test('Review Focus 2: payload fica em localStorage se o envio falha', async () => {
  const store = new Map();
  const ls = {
    setItem: (k, v) => store.set(k, v),
    getItem: (k) => store.get(k) ?? null,
    removeItem: (k) => store.delete(k),
    key: (i) => [...store.keys()][i],
    get length() { return store.size; },
  };
  enfileirarRetry(ls, 'uuid-2', serializar({ p1: 'Sim.' }, 'uuid-2'));
  assert.equal(drenarFila(ls).length, 1);
});

test('Review Focus 5: payload sempre contém uuid único (identidade para dedup)', () => {
  const a = JSON.parse(serializar({ p1: 'A' }));
  const b = JSON.parse(serializar({ p1: 'A' }));
  assert.notEqual(a.uuid, b.uuid);
});
```

Rodar: `node --test tests/submit.test.js` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/submit.js tests/submit.test.js
git commit -m "feat: envio com retry via localStorage e uuid por submissão"
```

---

## Task 7: Apps Script (Code.gs)

**Files:**
- Create: `apps-script/Code.gs`

**Interfaces:**
- Consumes: `SpreadsheetApp` global do Apps Script
- Produces: endpoint HTTPS que aceita POST com JSON e grava uma linha

- [ ] **Step 1: Criar `apps-script/Code.gs`**

```js
// Apps Script Web App para o formulário ACEFB na sua visão.
// Deploy: Implementar > Nova implementação > Tipo: App da Web
//   Executar como: Eu
//   Quem pode acessar: Qualquer pessoa
// Depois copie a URL /exec e cole em src/submit.js (APPS_SCRIPT_URL).

const SPREADSHEET_ID = 'TROQUE_PELO_ID_DA_PLANILHA';
const ABA = 'Respostas';
const CABECALHO = [
  'timestamp_iso', 'uuid',
  'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9', 'p10',
  'p11', 'p12', 'p13', 'p14', 'p15', 'p16', 'p17', 'p18', 'p19', 'p20'
];
const SEPARADOR = ' | ';

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const sheet = garantirAba_();
    const linha = montarLinha_(body);
    sheet.appendRow(linha);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, erro: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function garantirAba_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(ABA);
  if (!sheet) {
    sheet = ss.insertSheet(ABA);
    sheet.appendRow(CABECALHO);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(CABECALHO);
  }
  return sheet;
}

function montarLinha_(body) {
  const tz = 'America/Sao_Paulo';
  const timestamp = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd'T'HH:mm:ssXXX");
  const linha = [timestamp, body.uuid || ''];
  for (let i = 1; i <= 20; i++) {
    const key = 'p' + i;
    const v = body[key];
    if (v === undefined || v === null) linha.push('');
    else if (Array.isArray(v)) linha.push(v.join(SEPARADOR));
    else linha.push(String(v));
  }
  return linha;
}
```

- [ ] **Step 2: Review Focus item 4 — array vira string na Sheet**

Não há runtime Node para testar Apps Script direto. O comportamento é verificado inline no `montarLinha_`: array passa por `v.join(SEPARADOR)`. Documentar a verificação como passo manual:

> Após deploy (Task 8), fazer um POST de teste com `{"uuid":"t1","p7":["A","B"]}` e inspecionar a planilha: a coluna p7 da linha nova deve mostrar `A | B`.

- [ ] **Step 3: Commit**

```bash
git add apps-script/Code.gs
git commit -m "feat: Apps Script doPost com appendRow em planilha e timestamp SP"
```

---

## Task 8: Criar planilha, deployar Apps Script, cablear URL

**Files:**
- Modify: `src/submit.js` (constante `APPS_SCRIPT_URL`)
- Modify: `apps-script/Code.gs` (constante `SPREADSHEET_ID`)

Esta task é **operacional** no browser logado em `jcficanha.tsl@gmail.com`. Steps são ações manuais acompanhadas, não código.

- [ ] **Step 1: Criar planilha nova** em `drive.google.com` chamada "ACEFB na sua visão — Respostas". Anotar o ID da URL (`/d/<ID>/edit`).

- [ ] **Step 2: Abrir Extensões > Apps Script** na planilha. Colar `apps-script/Code.gs` substituindo o conteúdo padrão. Trocar `SPREADSHEET_ID` pelo valor anotado.

- [ ] **Step 3: Implementar > Nova implementação > Tipo: App da Web.**
  - Descrição: "ACEFB form endpoint v1"
  - Executar como: Eu
  - Quem pode acessar: Qualquer pessoa
  - Copiar a URL `/exec` gerada.

- [ ] **Step 4: Rodar função `garantirAba_`** uma vez manualmente no editor do Apps Script para autorizar escopos de Sheets. A primeira execução pede permissão: aceitar.

- [ ] **Step 5: Colar a URL em `src/submit.js`** no lugar do placeholder.

- [ ] **Step 6: Teste de fumaça — POST manual via curl**

```bash
curl -L -X POST 'URL_COPIADA/exec' \
  -H 'Content-Type: text/plain;charset=utf-8' \
  -d '{"uuid":"teste-manual","p1":"Sim, tenho 18 anos ou mais e aceito participar.","p7":["Micro e pequenos empresários e autônomos.","Trabalhadores."]}'
```

Esperado: `{"ok":true}` na saída. Verificar na planilha que apareceu uma linha com timestamp, uuid=`teste-manual`, p1 preenchido, p7 = `Micro... | Trabalhadores.`.

- [ ] **Step 7: Commit**

```bash
git add src/submit.js apps-script/Code.gs
git commit -m "chore: cablear URL do Apps Script e ID da planilha"
```

---

## Task 9: Criar repo GitHub + GitHub Pages

Esta task é **operacional** no GitHub logado em `jcficanha.tsl@gmail.com`.

- [ ] **Step 1: Criar repo público `acefb-pesquisa`** na conta GitHub do Júlio.

- [ ] **Step 2: Vincular remote e push**

```bash
git remote add origin https://github.com/<handle>/acefb-pesquisa.git
git branch -M main
git push -u origin main
```

- [ ] **Step 3: Ativar GitHub Pages** em Settings > Pages: Source = Deploy from a branch, Branch = `main`, Folder = `/ (root)`. Salvar.

- [ ] **Step 4: Aguardar deploy (~1 min)** e capturar a URL `https://<handle>.github.io/acefb-pesquisa/`.

- [ ] **Step 5: Smoke test** — abrir a URL no celular (ou DevTools mobile viewport), responder "Não" na p1, verificar que uma linha nova aparece na planilha com apenas p1 preenchido.

---

## Task 10: Teste end-to-end em viewport mobile

**Files:** nenhum (ação de verificação)

- [ ] **Step 1: Percorrer os 4 caminhos canônicos** no DevTools com viewport 375×667 (iPhone SE):

  1. p1 "Não." → fim
  2. p1 Sim → p2 "Não sei informar." → fim
  3. p1 Sim → p2 Não → p3 Sim → fim
  4. p1 Sim → p2 Não → p3 Não → p4 "Não." → seção 6 completa → p18 Sim → seção 7 completa → fim (caminho mais longo com todas as perguntas opcionais ativas; **inclui p7 e p12 com múltiplas marcações respeitando os limites e a exclusividade**)

- [ ] **Step 2: Caso de rede caída** — DevTools > Network > Offline, submeter uma resposta, confirmar que a tela final aparece. Voltar para online, abrir console e esperar o retry drenar (`localStorage` deve esvaziar em até 15s).

- [ ] **Step 3: Verificar planilha** — todas as submissões apareceram, nenhum campo trocado de coluna, timestamps em America/Sao_Paulo.

- [ ] **Step 4: Checagem visual mínima** — fontes legíveis, botão alcançável com polegar, nenhum overflow horizontal, nenhuma tela que exija zoom.

---

## Task 11: README para handoff à Evolve

**Files:**
- Create: `README.md`

- [ ] **Step 1: Escrever `README.md`**

```markdown
# ACEFB na sua visão — Pesquisa

Formulário web público para a pesquisa "ACEFB na sua visão" da Evolve.
Respostas gravadas em Google Sheets via Google Apps Script.

**URL ao vivo:** https://<handle>.github.io/acefb-pesquisa/

## Como editar as perguntas

Textos, opções e regras de desvio vivem em `src/perguntas.js`.
Depois de editar, commit + push: GitHub Pages republica em ~1 min.

## Como baixar as respostas

1. Abrir a planilha "ACEFB na sua visão — Respostas" no Drive.
2. Arquivo > Fazer download > `.xlsx` ou `.csv`.

## Como transferir a planilha para a Evolve

1. Na planilha, Compartilhar.
2. Clicar nos três pontos ao lado do dono > Transferir propriedade para o e-mail da Evolve.
3. A Evolve aceita o convite recebido por e-mail.

## Como transferir o Apps Script

O Apps Script fica atrelado à conta que o criou. Para a Evolve assumir:
1. Eles criam uma cópia do script sob a conta deles (Extensões > Apps Script dentro da planilha transferida).
2. Reimplementam o Web App.
3. Atualizam `src/submit.js` com a nova URL `/exec`.
4. Commit + push.

## Rodar testes locais

Requer Node 20+.

```bash
npm test
```

## Rodar servidor de dev local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
```
```

- [ ] **Step 2: Commit e push final**

```bash
git add README.md
git commit -m "docs: README com instruções de edição, baixar respostas e handoff"
git push
```

---

## Resumo das verificações do Review Focus

| Item | Task | Como foi coberto |
|---|---|---|
| 1 | 3 | Testes em `tests/validacao.test.js` cobrem marcar exclusiva com não-exclusivas presentes e vice-versa |
| 2 | 6 | Teste `enfileirar e drenar` + "payload fica em localStorage se envio falha" |
| 3 | 4 | Teste "payload de saída precoce" em `tests/estado.test.js` |
| 4 | 7 | Verificação manual no Step 2 da Task 7, confirmada via curl na Task 8 |
| 5 | 6 | Teste "payload sempre contém uuid único" |
