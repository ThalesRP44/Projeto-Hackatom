import test from 'node:test';
import assert from 'node:assert/strict';
import { Product } from '../server/features/products/models/Product.js';
import { hashProduct } from '../server/features/products/utils/hash.js';

test('produto protege o estado e só permite concluir uma vez', () => {
  const row = {
    id: 'produto',
    producer_name: 'Ana Silva',
    tree_species: 'Eucalipto',
    latitude: -23.555,
    longitude: -46.666,
    photo_before: 'before',
    photo_after: null,
    status: 'pending',
  };
  const product = new Product(row);
  row.status = 'completed';
  const copy = product.toRow();
  copy.photo_after = 'alterado';
  assert.equal(product.toRow().status, 'pending');
  assert.equal(product.toRow().photo_after, null);

  product.complete('after', { buffer: Buffer.from('evidência') });
  const completed = product.toRow();
  assert.equal(completed.status, 'completed');
  assert.equal(completed.hash, hashProduct(completed));
  assert.throws(() => product.complete('outra', { buffer: Buffer.from('outra') }), { status: 409 });
  assert.deepEqual(product.toRow(), completed);

  const publicData = product.toPublicData();
  assert.equal('producer_name' in publicData, false);
  assert.deepEqual(publicData.approximate_location, { latitude: -23.55, longitude: -46.67 });
});
