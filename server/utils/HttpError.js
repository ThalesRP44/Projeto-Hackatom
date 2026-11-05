// Erro esperado: carrega o código HTTP e uma mensagem segura para o usuário.
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
