import { ProductService } from '../services/productService.js';
import { Product } from '../models/Product.js';
import { HttpError } from '../../../shared/errors/HttpError.js';

// Traduz requisições HTTP em chamadas de serviço e escolhe os dados da resposta.
export class ProductController {
  #service;
  #repository;
  #publicBaseUrl;

  constructor(service, repository, publicBaseUrl) {
    this.#service = service;
    this.#repository = repository;
    this.#publicBaseUrl = publicBaseUrl;
  }
  // O comprovante contém somente os dados necessários para a consulta de rastreio.
  receipt(row) {
    return new Product(row).toReceipt(this.#publicBaseUrl);
  }
  // 201 indica que um produto novo foi criado, com comprovante pronto para a interface.
  register = async (req, res) => {
    res.status(201).json(this.receipt(await this.#service.register(req.body, req.files || {})));
  };
  complete = async (req, res) => {
    res.json(this.receipt(await this.#service.complete(req.params.id, req.file)));
  };
  find = async (req, res) => {
    // Seleciona explicitamente os campos públicos, em vez de devolver a linha inteira do banco.
    const row = await this.#repository.find(req.params.id);
    if (!row) throw new HttpError(404, 'Produto não encontrado.');
    res.set('Cache-Control', 'no-store').json(new Product(row).toPublicData());
  };
  photo = async (req, res) => {
    // O cliente escolhe apenas before/after; o caminho real é obtido pelo registro do produto.
    if (!['before', 'after'].includes(req.params.kind))
      throw new HttpError(404, 'Foto não encontrada.');
    const row = await this.#repository.find(req.params.id);
    const path = row?.[`photo_${req.params.kind}`];
    const file = path ? await this.#repository.readPhoto(path) : null;
    if (!file) throw new HttpError(404, 'Foto não encontrada.');
    res.set('Cache-Control', 'no-store').type(file.mimetype).send(file.buffer);
  };
}

export const createProductController = (repository, publicBaseUrl) =>
  new ProductController(new ProductService(repository), repository, publicBaseUrl);
