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
