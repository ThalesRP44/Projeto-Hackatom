// Valida a configuração antes de abrir o banco e iniciar o servidor.
// O endereço fixo de loopback mantém a aplicação acessível apenas neste computador.
export function loadConfig() {
  const required = ['API_WRITE_TOKEN', 'PUBLIC_BASE_URL'];
  for (const key of required)
    if (!process.env[key]) throw new Error(`Configure ${key} no arquivo .env.`);
  if (process.env.API_WRITE_TOKEN.length < 24)
    throw new Error('API_WRITE_TOKEN deve ter pelo menos 24 caracteres.');
  const base = new URL(process.env.PUBLIC_BASE_URL);
  if (!['http:', 'https:'].includes(base.protocol))
    throw new Error('PUBLIC_BASE_URL deve usar HTTP ou HTTPS.');

  if (!['localhost', '127.0.0.1', '[::1]'].includes(base.hostname))
    throw new Error(
      'PUBLIC_BASE_URL deve apontar para localhost: a aplicação aceita apenas acesso local.',
    );
  return {
    port: Number(process.env.PORT || 3001),
    host: '127.0.0.1',
    writeToken: process.env.API_WRITE_TOKEN,
    publicBaseUrl: base.origin,
  };
}
