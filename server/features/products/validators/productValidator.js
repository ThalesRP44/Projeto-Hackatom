import { HttpError } from '../../../shared/errors/HttpError.js';
export { validateImage } from '../../../shared/validators/imageValidator.js';

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
