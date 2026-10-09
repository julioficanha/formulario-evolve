import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><main id="app"></main></body></html>');
globalThis.document = dom.window.document;
globalThis.window = dom.window;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.Event = dom.window.Event;

// Importa depois de montar o DOM — módulos ES avaliam no import.
const { renderSecao } = await import('../src/render.js');
const { perguntas } = await import('../src/perguntas.js');

const P7 = perguntas.find(p => p.id === 'p7');
const P12 = perguntas.find(p => p.id === 'p12');

let app;
let respostas;
function onChange(id, valor) { respostas[id] = valor; }

beforeEach(() => {
  app = document.getElementById('app');
  app.innerHTML = '';
  respostas = {};
});

function clicar(perguntaId, texto) {
  const label = Array.from(app.querySelectorAll(`.pergunta[data-id="${perguntaId}"] label.opcao`))
    .find(l => l.textContent.trim() === texto);
  if (!label) throw new Error(`label "${texto}" não encontrado em ${perguntaId}`);
  const input = label.querySelector('input');
  input.checked = !input.checked;
  input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
}

function checkedTextosDe(perguntaId) {
  return Array.from(app.querySelectorAll(`.pergunta[data-id="${perguntaId}"] input[type="checkbox"]`))
    .filter(i => i.checked).map(i => i.value);
}

function renderS5() {
  // S5 contém p7, mas aqui queremos só p7 isolado — montar manualmente.
  app.appendChild(renderSecaoApenas(P7));
}
function renderS5Com12() {
  app.appendChild(renderSecaoApenas(P12));
}
function renderSecaoApenas(pergunta) {
  // Monta uma seção fake que contém só a pergunta pedida, reusando renderSecao
  // seria mais fiel, mas renderSecao exige uma secao de verdade. Para o teste do
  // bug, basta reproduzir o estado DOM gerado por renderPergunta via renderSecao
  // na seção real da pergunta.
  const sec = document.createElement('section');
  sec.appendChild(renderSecao(pergunta.secao, respostas, onChange));
  return sec;
}

test('p7: marcar duas opções não-exclusivas mantém ambas no modelo', () => {
  renderS5();
  clicar('p7', 'Micro e pequenos empresários e autônomos.');
  clicar('p7', 'Médios e grandes empresários.');
  assert.ok(Array.isArray(respostas.p7));
  assert.equal(respostas.p7.length, 2);
  assert.deepEqual(
    respostas.p7.sort(),
    ['Micro e pequenos empresários e autônomos.', 'Médios e grandes empresários.'].sort()
  );
  assert.deepEqual(checkedTextosDe('p7').sort(), respostas.p7.sort());
});

test('p7: marcar exclusiva depois de não-exclusivas limpa DOM e modelo', () => {
  renderS5();
  clicar('p7', 'Micro e pequenos empresários e autônomos.');
  clicar('p7', 'Médios e grandes empresários.');
  clicar('p7', 'Nenhum desses públicos.');
  assert.deepEqual(respostas.p7, ['Nenhum desses públicos.']);
  assert.deepEqual(checkedTextosDe('p7'), ['Nenhum desses públicos.']);
});

test('p7: marcar não-exclusiva depois de exclusiva remove a exclusiva', () => {
  renderS5();
  clicar('p7', 'Não sei dizer.');
  assert.deepEqual(respostas.p7, ['Não sei dizer.']);
  clicar('p7', 'Trabalhadores.');
  assert.ok(!respostas.p7.includes('Não sei dizer.'));
  assert.ok(respostas.p7.includes('Trabalhadores.'));
  assert.deepEqual(checkedTextosDe('p7').sort(), respostas.p7.sort());
});

test('p7: desmarcar uma opção remove apenas aquela do modelo', () => {
  renderS5();
  clicar('p7', 'Micro e pequenos empresários e autônomos.');
  clicar('p7', 'Médios e grandes empresários.');
  // desmarca a primeira
  clicar('p7', 'Micro e pequenos empresários e autônomos.');
  assert.deepEqual(respostas.p7, ['Médios e grandes empresários.']);
  assert.deepEqual(checkedTextosDe('p7'), ['Médios e grandes empresários.']);
});

test('p12: três não-exclusivas são preservadas (maxEscolhas=3)', () => {
  renderS5Com12();
  // Pegar três não-exclusivas da p12 (primeiras três opções não-exclusivas)
  const naoExcl = P12.opcoes.filter(o => !P12.opcoesExclusivas.includes(o)).slice(0, 3);
  for (const o of naoExcl) clicar('p12', o);
  assert.equal(respostas.p12.length, 3);
  assert.deepEqual(respostas.p12.sort(), naoExcl.slice().sort());
});

test('p12: quarta opção não-exclusiva remove a mais antiga (maxEscolhas=3)', () => {
  renderS5Com12();
  const naoExcl = P12.opcoes.filter(o => !P12.opcoesExclusivas.includes(o)).slice(0, 4);
  for (const o of naoExcl) clicar('p12', o);
  assert.equal(respostas.p12.length, 3);
  // A última clicada deve estar; a primeira já não deve mais.
  assert.ok(respostas.p12.includes(naoExcl[3]));
  assert.ok(!respostas.p12.includes(naoExcl[0]));
});
