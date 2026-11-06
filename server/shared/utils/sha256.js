import { createHash } from 'node:crypto';
// Resumo dos bytes ou de uma representação canônica, reutilizável entre funcionalidades.
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
