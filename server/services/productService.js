import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils/HttpError.js';
import { sha256, hashProduct } from '../utils/hash.js';
import { validateProduct, validateImage } from '../validators/productValidator.js';

// Coordena validação, fotos, UUID e hash antes de persistir o produto.
// Recebe o repositório como dependência para permitir testes sem banco real.
export function createProductService(repository) {
  return {
    async register(input, files) {
      // Valida tudo antes de iniciar a gravação, evitando fotos de cadastros inválidos.
      const fields = validateProduct(input);
      const before = validateImage(files.photo_before?.[0]);
      const after = files.photo_after?.[0] ? validateImage(files.photo_after[0]) : null;
      const id = randomUUID();
      const uploaded = [];
      // Guarda os caminhos criados para removê-los se uma etapa posterior falhar.
      try {
        const photo_before = await repository.upload(`${id}/before`, before);
        uploaded.push(photo_before);
        let photo_after = null;
        if (after) {
          photo_after = await repository.upload(`${id}/after`, after);
          uploaded.push(photo_after);
        }
        const row = {
          id,
          ...fields,
          photo_before,
          photo_after,
          photo_before_hash: sha256(before.buffer),
          photo_after_hash: after ? sha256(after.buffer) : null,
          status: after ? 'completed' : 'pending',
          created_at: new Date().toISOString(),
        };
        row.hash = hashProduct(row);
        // O hash inclui os campos e os resumos das fotos, não apenas seus nomes.
        return await repository.insert(row);
      } catch (error) {
        if (uploaded.length)
          await repository
            .remove(uploaded)
            .catch((e) => console.error('Falha na limpeza de fotos:', e.message));
        throw error;
      }
    },
    async complete(id, file) {
      // A foto posterior só pode ser adicionada uma vez; o repositório também garante isso.
      const after = validateImage(file);
      const existing = await repository.find(id);
      if (!existing) throw new HttpError(404, 'Produto não encontrado.');
      if (existing.photo_after) throw new HttpError(409, 'A foto posterior já foi registrada.');
      const path = await repository.upload(`${id}/after-${randomUUID()}`, after);
      // Um caminho exclusivo permite limpar esta tentativa sem apagar outra foto concorrente.
      try {
        const row = {
          ...existing,
          photo_after: path,
          photo_after_hash: sha256(after.buffer),
          status: 'completed',
        };
        row.hash = hashProduct(row);
        return await repository.complete(id, row);
      } catch (error) {
        await repository.remove([path]).catch((e) => console.error('Falha na limpeza:', e.message));
        throw error;
      }
    },
  };
}
