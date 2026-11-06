import { timingSafeEqual } from 'node:crypto';

// As operações de escrita de produtos exigem a senha compartilhada do MVP.
// A comparação em tempo constante reduz diferenças de tempo entre senhas inválidas.
export function createAuth(writeToken) {
  return (req, res, next) => {
    const supplied = Buffer.from(req.get('Authorization')?.replace(/^Bearer /, '') || '');
    const expected = Buffer.from(writeToken);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
      return res.status(401).json({ error: 'Senha de cadastro inválida.' });
    }
    next();
  };
}
