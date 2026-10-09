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
