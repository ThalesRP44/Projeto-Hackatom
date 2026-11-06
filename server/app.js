import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { createCors } from './middleware/cors.js';
import { createProductRoutes } from './routes/productRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

// Monta a aplicação sem abrir portas; os testes podem escolher uma porta temporária.
export function createApp(options) {
  const app = express();
  app.disable('x-powered-by');
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(createCors(options.corsOrigins));
  // Saúde do processo: não exige senha e não retorna credenciais nem caminhos privados.
  app.get('/api/health', (req, res) =>
    res.json({ status: 'ok', database: 'sqlite', storage: 'local' }),
  );
  app.use(
    '/api',
    rateLimit({
      windowMs: 60000,
      limit: 90,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Muitas solicitações. Aguarde um minuto.' },
    }),
  );
  app.use('/api/products', createProductRoutes(options));
  app.use((req, res) => res.status(404).json({ error: 'Rota não encontrada.' }));
  app.use(errorHandler);
  return app;
}
