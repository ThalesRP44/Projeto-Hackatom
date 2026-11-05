import { createProductService } from '../services/productService.js';
import { HttpError } from '../utils/HttpError.js';

// Traduz requisições HTTP em chamadas de serviço e escolhe os dados da resposta.
export function createProductController(repository, publicBaseUrl) {
  const service = createProductService(repository);
  // O comprovante contém somente os dados necessários para a consulta de rastreio.
  const receipt = (row) => ({
    id: row.id,
    hash: row.hash,
    status: row.status,
    tracking_url: `${publicBaseUrl}/rastreio/${row.id}`,
  });
  return {
    // 201 indica que um produto novo foi criado, com comprovante pronto para a interface.
    async register(req, res) {
      res.status(201).json(receipt(await service.register(req.body, req.files || {})));
    },
    async complete(req, res) {
      res.json(receipt(await service.complete(req.params.id, req.file)));
    },
    async find(req, res) {
      // Seleciona explicitamente os campos públicos, em vez de devolver a linha inteira do banco.
      const row = await repository.find(req.params.id);
      if (!row) throw new HttpError(404, 'Produto não encontrado.');
      const photo_before = `/api/products/${row.id}/photos/before`;
      const photo_after = row.photo_after ? `/api/products/${row.id}/photos/after` : null;
      res.set('Cache-Control', 'no-store').json({
        id: row.id,
        tree_species: row.tree_species,
        extraction_date: row.extraction_date,
        status: row.status,
        hash: row.hash,
        created_at: row.created_at,
        // A consulta pública não revela o nome do produtor nem as coordenadas precisas.
        approximate_location: {
          latitude: Number(row.latitude.toFixed(2)),
          longitude: Number(row.longitude.toFixed(2)),
        },
        photo_before,
        photo_after,
      });
    },
    async photo(req, res) {
      // O cliente escolhe apenas before/after; o caminho real é obtido pelo registro do produto.
      if (!['before', 'after'].includes(req.params.kind))
        throw new HttpError(404, 'Foto não encontrada.');
      const row = await repository.find(req.params.id);
      const path = row?.[`photo_${req.params.kind}`];
      const file = path ? await repository.readPhoto(path) : null;
      if (!file) throw new HttpError(404, 'Foto não encontrada.');
      res.set('Cache-Control', 'no-store').type(file.mimetype).send(file.buffer);
    },
  };
}
