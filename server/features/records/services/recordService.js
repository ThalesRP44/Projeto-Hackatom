import { HttpError } from '../../../shared/errors/HttpError.js';
import { validateRecord, validateAttempt, text, uuid } from '../validators/recordValidator.js';

export class RecordService {
  constructor(repository) {
    this.repository = repository;
  }
  requireRecord(id) {
    const record = this.repository.find(id);
    if (!record) throw new HttpError(404, 'Registro não encontrado.');
    return record;
  }
  create(input, files) {
    const { record, photos } = validateRecord(input, files);
    return this.repository.transaction(() => {
      // Repetir um rascunho já recebido não duplica registros nem consome novos códigos.
      return this.repository.find(record.id) || this.repository.insert(record, photos);
    });
  }
  rename(id, name) {
    const validName = text(name, 'Nome do registro');
    return this.repository.transaction(() =>
      this.repository.update({
        ...this.requireRecord(id),
        name: validName,
        updatedAt: new Date().toISOString(),
      }),
    );
  }
  addAttempt(id, productId, phase, input, file) {
    if (!uuid(productId) || !['before', 'after'].includes(phase))
      throw new HttpError(400, 'Produto ou etapa inválidos.');
    const { metadata, file: image } = validateAttempt(input, file);
    return this.repository.transaction(() => {
      const record = this.requireRecord(id);
      const product = record.products.find((p) => p.id === productId);
      if (!product) throw new HttpError(404, 'Produto não encontrado.');
      const all = record.products.flatMap((p) => [...p.before, ...p.after]);
      if (all.some((a) => a.id === metadata.id)) {
        if (product[phase].some((a) => a.id === metadata.id)) return record;
        throw new HttpError(409, 'Identificador de tentativa já utilizado.');
      }
      if (product[phase].length >= 3)
        throw new HttpError(409, 'Limite de três tentativas atingido.');
      this.repository.insertPhoto(id, metadata.id, image);
      product[phase].push({ ...metadata, number: product[phase].length + 1 });
      record.updatedAt = new Date().toISOString();
      return this.repository.update(record);
    });
  }
}
