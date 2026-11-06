import { createHash } from 'node:crypto';

// Calcula um resumo determinístico para detectar alterações nos bytes ou nos campos.
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

// Campos específicos de produtos em ordem fixa mantêm o hash reproduzível.
export function hashProduct(row) {
  return sha256(
    JSON.stringify(
      Object.fromEntries(
        [
          'id',
          'producer_name',
          'tree_species',
          'latitude',
          'longitude',
          'extraction_date',
          'photo_before',
          'photo_after',
          'photo_before_hash',
          'photo_after_hash',
          'status',
          'created_at',
        ].map((key) => [key, row[key] ?? null]),
      ),
    ),
  );
}
