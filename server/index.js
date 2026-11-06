import { createApp } from './app.js';
import { ProductRepository } from './features/products/repositories/productRepository.js';
import { RecordRepository } from './features/records/repositories/recordRepository.js';
import { loadConfig } from './config/env.js';

// Ponto de entrada da API: carrega configuração, abre o banco e inicia a escuta.
const config = loadConfig();
const repository = new ProductRepository();
const recordRepository = new RecordRepository();
const server = createApp({ ...config, repository, recordRepository }).listen(
  config.port,
  config.host,
  () => {
    console.log(`API: http://${config.host}:${config.port}`);
    console.log('Banco e fotos locais: data/reboot.sqlite');
  },
);
server.on('error', (error) => {
  console.error(`Não foi possível iniciar a API: ${error.message}`);
  repository.close();
  recordRepository.close();
  process.exit(1);
});
// Aguarda as requisições em andamento antes de fechar a conexão SQLite.
for (const signal of ['SIGINT', 'SIGTERM'])
  process.once(signal, () => {
    server.close(() => {
      repository.close();
      recordRepository.close();
      process.exit(0);
    });
  });
