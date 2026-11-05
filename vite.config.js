import { defineConfig } from 'vite';
// O navegador usa /api no mesmo endereço do frontend; o Vite encaminha para a API local.
export default defineConfig({
  server: { host: '127.0.0.1', strictPort: true, proxy: { '/api': 'http://127.0.0.1:3001' } },
  preview: { host: '127.0.0.1', strictPort: true },
});
