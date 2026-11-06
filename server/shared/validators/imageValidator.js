import { HttpError } from '../errors/HttpError.js';

// Valida os bytes recebidos em ambas as funcionalidades; nome e MIME não bastam.
export function validateImage(file) {
  const bad = (message) => {
    throw new HttpError(400, message);
  };
  if (!file) bad('Anexe uma foto válida.');
  const b = file.buffer;
  const png = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp =
    b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
  if (!mime || mime !== file.mimetype) bad('Envie uma imagem JPEG, PNG ou WebP válida.');
  if (b.length > 5 * 1024 * 1024) bad('Cada foto deve ter no máximo 5 MB.');
  return { ...file, mimetype: mime };
}
