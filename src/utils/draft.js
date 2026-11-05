import { empty } from './product.js';

// Chave estável: mantém compatibilidade com os rascunhos já salvos neste navegador.
export const draftKey = 'reboot-product-draft-v1';
// JSON inválido ou armazenamento bloqueado não deve impedir abrir o cadastro.
export function loadDraft() {
  try {
    return { ...empty(), ...JSON.parse(localStorage.getItem(draftKey) || '{}') };
  } catch {
    return empty();
  }
}
