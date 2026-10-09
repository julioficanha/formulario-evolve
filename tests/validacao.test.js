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
