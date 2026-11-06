import { sha256 } from './sha256.js';
import { HttpError } from '../errors/HttpError.js';

// Exclui nome do registro e resultados de análise: só mudanças nas evidências/tipo invalidam a triagem.
export function evidenceHash(product) {
  return sha256(
    JSON.stringify({
      id: product.id,
      species: product.species,
      productType: product.productType || '',
      before: product.before,
      after: product.after,
    }),
  );
}
export function assertEnvironmentalApproval(record) {
  for (const product of record.products) {
    const a = product.environmentalAnalysis;
    if (
      !a ||
      a.status !== 'completed' ||
      a.mode !== 'live' ||
      a.stale ||
      a.inputHash !== evidenceHash(product) ||
      a.decisao_token?.pode_emitir !== true ||
      a.decisao_token?.status !== 'sem_alertas_detectados' ||
      a.decisao_token?.tipo_token !== 'rastro_experimental'
    ) {
      throw new HttpError(
        409,
        'A etiqueta exige análise ambiental atual de todos os produtos, sem alertas e com evidências suficientes. Referência, erro ou dados ausentes não liberam token.',
      );
    }
  }
}
