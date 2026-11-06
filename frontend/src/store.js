import { api } from './api.js';
export { uid, appendAttempt, isComplete, distance, discrepancies } from './domain/record.js';

// Mantém o contrato esperado pelas telas do ZIP, substituindo IndexedDB por HTTP.
export const listRecords = () => api('/api/records');
export function storageErrorMessage(error) {
  return `${error.message || 'Não foi possível salvar na API local.'} Seu rascunho continua nesta tela; não atualize a página.`;
}
function photoFile(attempt) {
  if (!(attempt.photo instanceof Blob)) throw new Error('A tentativa precisa de uma foto válida.');
  if (attempt.photo.size > 5 * 1024 * 1024) throw new Error('Cada foto deve ter no máximo 5 MB.');
  return attempt.photo;
}
function metadata(attempt) {
  const { photo, ...rest } = attempt;
  return rest;
}
export async function createRecord(record) {
  const body = new FormData();
  const products = record.products.map((product) => ({
    ...product,
    before: product.before.map((attempt) => {
      body.append('photos', photoFile(attempt), attempt.id);
      return metadata(attempt);
    }),
    after: product.after.map((attempt) => {
      body.append('photos', photoFile(attempt), attempt.id);
      return metadata(attempt);
    }),
  }));
  body.append('record', JSON.stringify({ ...record, products }));
  return api('/api/records', { method: 'POST', body });
}
export const renameRecord = (id, name) =>
  api(`/api/records/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
export function addAttempt(recordId, productId, phase, attempt) {
  const body = new FormData();
  body.append('photo', photoFile(attempt), attempt.id);
  body.append('attempt', JSON.stringify(metadata(attempt)));
  return api(`/api/records/${recordId}/products/${productId}/attempts/${phase}`, {
    method: 'POST',
    body,
  });
}
