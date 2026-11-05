// Centraliza as chamadas à API; /api é encaminhado pelo Vite ao servidor local.
// Uma resposta HTTP de erro vira uma exceção para a página exibir a mensagem.
export async function request(url, options) {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a solicitação.');
  return body;
}
