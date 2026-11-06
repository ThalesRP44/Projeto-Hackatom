import multer from 'multer';
import { HttpError } from '../errors/HttpError.js';

// Último middleware: converte erros de upload, validação e infraestrutura em JSON.
// Os quatro parâmetros são necessários para o Express reconhecê-lo como tratador de erros.
export function errorHandler(error, req, res, next) {
  if (error.type === 'entity.parse.failed')
    return res.status(400).json({ error: 'JSON inválido.' });
  if (error instanceof multer.MulterError)
    return res.status(400).json({
      error:
        error.code === 'LIMIT_FILE_SIZE'
          ? 'Cada foto deve ter no máximo 5 MB.'
          : 'Campos ou arquivos inválidos.',
    });
  if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
  console.error('Erro no cadastro/consulta:', error.message);
  res.status(503).json({
    error:
      'Não foi possível acessar o banco local. Verifique o espaço e as permissões da pasta data e tente novamente.',
  });
}
