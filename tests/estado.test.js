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
