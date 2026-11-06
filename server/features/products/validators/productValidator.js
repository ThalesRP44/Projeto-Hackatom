import { HttpError } from '../../../shared/errors/HttpError.js';

// Valida novamente no servidor: as restrições HTML podem ser contornadas pelo cliente.
const bad = (message) => {
  throw new HttpError(400, message);
};

export function validateProduct(input) {
  const producer_name = typeof input.producer_name === 'string' ? input.producer_name.trim() : '';
  const tree_species = typeof input.tree_species === 'string' ? input.tree_species.trim() : '';
  if (producer_name.length < 2 || producer_name.length > 150)
    bad('Informe o produtor (2 a 150 caracteres).');
  if (tree_species.length < 2 || tree_species.length > 120)
    bad('Informe a espécie (2 a 120 caracteres).');
  const coordinate = (key, min, max) => {
    // Campos multipart chegam como texto; vazio não deve virar zero por conversão numérica.
    const raw = input[key];
    if (typeof raw !== 'string' || !raw.trim()) bad('Informe latitude e longitude.');
    const value = Number(raw);
    if (!Number.isFinite(value) || value < min || value > max) bad(`Coordenada inválida: ${key}.`);
    return value;
  };
  const latitude = coordinate('latitude', -90, 90);
  const longitude = coordinate('longitude', -180, 180);
  const extraction_date = input.extraction_date;
  // Compara a data convertida com a original para rejeitar dias inexistentes, como 30/02.
  if (
    typeof extraction_date !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(extraction_date) ||
    !Number.isFinite(Date.parse(extraction_date)) ||
    new Date(extraction_date).toISOString().slice(0, 10) !== extraction_date
  )
    bad('Informe uma data válida.');
  return { producer_name, tree_species, latitude, longitude, extraction_date };
}

export function validateImage(file) {
  if (!file) bad('Anexe a foto anterior à extração.');
  const b = file.buffer;
  // Confere a assinatura dos bytes: a extensão e o MIME informados pelo cliente não bastam.
  const png = b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = b.length > 3 && b[0] === 255 && b[1] === 216 && b[2] === 255;
  const webp =
    b.length >= 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP';
  const mime = png ? 'image/png' : jpeg ? 'image/jpeg' : webp ? 'image/webp' : null;
  if (!mime || mime !== file.mimetype) bad('Envie uma imagem JPEG, PNG ou WebP válida.');
  if (b.length > 5 * 1024 * 1024) bad('Cada foto deve ter no máximo 5 MB.');
  return { ...file, mimetype: mime };
}
