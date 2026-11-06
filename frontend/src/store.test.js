import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listRecords,
  createRecord,
  renameRecord,
  addAttempt,
  uid,
  appendAttempt,
  isComplete,
  discrepancies,
} from './store.js';
import { setApiToken } from './api.js';

test('adaptador envia registros, nomes e fotos à API sem armazenar a senha no navegador', async (t) => {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (path, options) => {
    calls.push({ path, ...options });
    return new Response(JSON.stringify({ id: 'saved' }), { status: 200 });
  };
  t.after(() => {
    globalThis.fetch = original;
    setApiToken('');
  });
  setApiToken('senha-teste');
  const attempt = { id: uid(), photo: new Blob(['foto'], { type: 'image/png' }), location: null };
  await listRecords();
  await createRecord({
    id: uid(),
    name: 'Área',
    producer: 'Ana',
    products: [{ id: uid(), species: 'Ipê', before: [attempt], after: [] }],
  });
  await renameRecord('registro', 'Novo nome');
  await addAttempt('registro', 'produto', 'after', attempt);
  assert.equal(calls[0].path, '/api/records');
  assert.equal(calls[0].headers.get('Authorization'), 'Bearer senha-teste');
  assert.ok(calls[1].body instanceof FormData);
  const metadata = JSON.parse(calls[1].body.get('record'));
  assert.equal('photo' in metadata.products[0].before[0], false);
  assert.equal(calls[1].body.get('photos').name, attempt.id);
  assert.equal(calls[1].headers.has('Content-Type'), false);
  assert.equal(calls[2].method, 'PATCH');
  assert.equal(calls[3].path, '/api/records/registro/products/produto/attempts/after');
});
test('adaptador mantém erros da API para a interface preservar o rascunho', async (t) => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(JSON.stringify({ error: 'Senha inválida.' }), { status: 401 });
  t.after(() => {
    globalThis.fetch = original;
  });
  await assert.rejects(listRecords(), { message: 'Senha inválida.', status: 401 });
});
test('regras originais mantêm o limite e os alertas identificados de demonstração', () => {
  let product = { id: uid(), species: 'Ipê', before: [], after: [] };
  const location = { source: 'demo', latitude: -3.119, longitude: -60.0217, accuracy: 0 };
  for (let i = 0; i < 3; i++) product = appendAttempt(product, 'before', { id: uid(), location });
  assert.throws(() => appendAttempt(product, 'before', { id: uid() }), /Limite/);
  product = appendAttempt(product, 'after', {
    id: uid(),
    location: { ...location, latitude: -3.124 },
  });
  assert.equal(isComplete({ products: [product] }), true);
  assert.equal(discrepancies(product, 'after').length, 3);
});
