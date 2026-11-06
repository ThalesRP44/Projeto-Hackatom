import { Router } from 'express';
import { ProductService } from '../services/productService.js';
import { ProductController } from '../controllers/productController.js';
import { createAuth } from '../../../shared/middlewares/auth.js';
import { upload } from '../middlewares/upload.js';
import { validateId } from '../middlewares/validateId.js';

// Declara o contrato HTTP e a ordem dos filtros antes de executar cada controlador.
export function createProductRoutes({ repository, writeToken, publicBaseUrl, authEnabled }) {
  const router = Router();
  const controller = new ProductController(
    new ProductService(repository),
    repository,
    publicBaseUrl,
  );
  const auth = createAuth(writeToken, authEnabled);
  router.post(
    '/',
    auth,
    upload.fields([
      { name: 'photo_before', maxCount: 1 },
      { name: 'photo_after', maxCount: 1 },
    ]),
    controller.register,
  );
  router.patch(
    '/:id/photo-after',
    validateId,
    auth,
    upload.single('photo_after'),
    controller.complete,
  );
  router.get('/:id', validateId, controller.find);
  router.get('/:id/photos/:kind', validateId, controller.photo);
  return router;
}
