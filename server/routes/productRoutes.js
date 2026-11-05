import { Router } from 'express';
import { createProductController } from '../controllers/productController.js';
import { createAuth } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { validateId } from '../middleware/validateId.js';

// Declara o contrato HTTP e a ordem dos filtros antes de executar cada controlador.
export function createProductRoutes({ repository, writeToken, publicBaseUrl }) {
  const router = Router();
  const controller = createProductController(repository, publicBaseUrl);
  const auth = createAuth(writeToken);
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
