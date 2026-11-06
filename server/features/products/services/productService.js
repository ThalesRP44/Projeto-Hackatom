import { randomUUID } from 'node:crypto';
import { HttpError } from '../../../shared/errors/HttpError.js';
import { Product } from '../models/Product.js';
import { validateProduct, validateImage } from '../validators/productValidator.js';

// Coordena validação, fotos, UUID e hash antes de persistir o produto.
// Recebe o repositório como dependência para permitir testes sem banco real.
export class ProductService {
  #repository;

  constructor(repository) {
    this.#repository = repository;
  }
  async register(input, files) {
    // Valida tudo antes de iniciar a gravação, evitando fotos de cadastros inválidos.
    const fields = validateProduct(input);
    const before = validateImage(files.photo_before?.[0]);
    const after = files.photo_after?.[0] ? validateImage(files.photo_after[0]) : null;
    const id = randomUUID();
    const uploaded = [];
    // Guarda os caminhos criados para removê-los se uma etapa posterior falhar.
    try {
      const photo_before = await this.#repository.upload(`${id}/before`, before);
      uploaded.push(photo_before);
      let photo_after = null;
      if (after) {
        photo_after = await this.#repository.upload(`${id}/after`, after);
        uploaded.push(photo_after);
      }
      const product = Product.register({ id, fields, photo_before, photo_after, before, after });
      // O hash inclui os campos e os resumos das fotos, não apenas seus nomes.
      return await this.#repository.insert(product.toRow());
    } catch (error) {
      if (uploaded.length)
        await this.#repository
          .remove(uploaded)
          .catch((e) => console.error('Falha na limpeza de fotos:', e.message));
      throw error;
    }
  }
  async complete(id, file) {
    // A foto posterior só pode ser adicionada uma vez; o repositório também garante isso.
    const after = validateImage(file);
    const existing = await this.#repository.find(id);
    if (!existing) throw new HttpError(404, 'Produto não encontrado.');
    const product = new Product(existing);
    product.assertPending();
    const path = await this.#repository.upload(`${id}/after-${randomUUID()}`, after);
    // Um caminho exclusivo permite limpar esta tentativa sem apagar outra foto concorrente.
    try {
      product.complete(path, after);
      return await this.#repository.complete(id, product.toRow());
    } catch (error) {
      await this.#repository
        .remove([path])
        .catch((e) => console.error('Falha na limpeza:', e.message));
      throw error;
    }
  }
}

export const createProductService = (repository) => new ProductService(repository);
