import { timingSafeEqual } from 'node:crypto';

// As operações privadas de produtos e registros usam a mesma senha local do MVP.
// A comparação em tempo constante reduz diferenças de tempo entre senhas inválidas.
export function createAuth(writeToken, enabled = true) {
  return (req, res, next) => {
    // No MVP local sem login, as rotas seguem diretamente para o controlador.
    if (!enabled) return next();
    const supplied = Buffer.from(req.get('Authorization')?.replace(/^Bearer /, '') || '');
    const expected = Buffer.from(writeToken);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: 'Senha de cadastro inválida.' });
    }
    next();
  };
}
