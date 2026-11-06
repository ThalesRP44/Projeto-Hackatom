export const MAX_ATTEMPTS = 3;
export const ALERT_DISTANCE_M = 100;
export function uid(cryptoApi = globalThis.crypto) {
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  // randomUUID exige contexto seguro; getRandomValues também funciona via HTTP na LAN.
  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
export function appendAttempt(product, phase, attempt) {
  if (!['before', 'after'].includes(phase)) throw new Error('Tipo de foto inválido.');
  const attempts = product[phase];
  if (attempts.some((a) => a.id === attempt.id)) return product;
  if (attempts.length >= MAX_ATTEMPTS) throw new Error('Limite de três tentativas atingido.');
  return { ...product, [phase]: [...attempts, { ...attempt, number: attempts.length + 1 }] };
}
export const isComplete = (record) =>
  record.products.length > 0 &&
  record.products.every(
    (p) => p.species.trim() && p.before.some((a) => a.location) && p.after.some((a) => a.location),
  );
/** Distância aproximada em metros pela fórmula de Haversine; recebe latitude/longitude em graus. */
export function distance(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude),
    dLon = rad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
/**
 * Compara a última tentativa da etapa com as demais evidências do mesmo produto.
 * Não mistura GPS real com simulação. O alerta exige distância acima do limiar
 * mais a soma das precisões, reduzindo avisos por oscilação do GPS.
 * O resultado orienta conferência humana; não é uma classificação de fraude.
 */
export function discrepancies(product, phase) {
  const current = product[phase].at(-1);
  if (!current?.location) return [];
  return [...product.before, ...product.after]
    .filter(
      (a) => a.id !== current.id && a.location && a.location.source === current.location.source,
    )
    .map((a) => ({
      attempt: a,
      meters: distance(a.location, current.location),
      uncertainty: (a.location.accuracy || 0) + (current.location.accuracy || 0),
    }))
    .filter((d) => d.meters > ALERT_DISTANCE_M + d.uncertainty);
}
