import { sha256 } from '../../../shared/utils/sha256.js';

// Hash calculado no servidor, abrangendo os históricos e os hashes dos bytes das fotos.
export function recordHash(record) {
  return sha256(JSON.stringify(record));
}
export function presentRecord(record, publicBaseUrl, publicView = false) {
  const products = record.products.map((product) => ({
    ...product,
    before: product.before.map((a) => presentAttempt(a, record.id, publicView)),
    after: product.after.map((a) => presentAttempt(a, record.id, publicView)),
  }));
  const common = {
    id: record.id,
    code: record.code,
    products,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    hash: recordHash(record),
    tracking_url: `${publicBaseUrl}/rastreio/${record.id}`,
  };
  return publicView ? common : { ...common, name: record.name, producer: record.producer };
}
function presentAttempt(attempt, recordId, publicView) {
  const location = !attempt.location
    ? null
    : publicView
      ? {
          source: attempt.location.source,
          latitude: Number(attempt.location.latitude.toFixed(2)),
          longitude: Number(attempt.location.longitude.toFixed(2)),
        }
      : attempt.location;
  return { ...attempt, location, photo: `/api/records/${recordId}/photos/${attempt.id}` };
}
