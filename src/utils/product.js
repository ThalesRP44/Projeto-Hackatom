// Usa a data local para evitar que o fuso UTC altere o dia inicial do formulário.
export const localDate = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const empty = () => ({
  producer_name: '',
  tree_species: '',
  latitude: '',
  longitude: '',
  extraction_date: localDate(),
});
export const labels = { pending: 'Aguardando foto posterior', completed: 'Evidências registradas' };
