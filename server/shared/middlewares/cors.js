// Filtro compartilhado: libera origens configuradas e aceita clientes sem Origin (CLI).
export function createCors(allowedOrigins = []) {
  const origins = new Set(allowedOrigins);
  const methods = ['GET', 'POST', 'PATCH', 'OPTIONS'];
  const headers = ['authorization', 'content-type'];

  return (req, res, next) => {
    res.vary('Origin');
    const origin = req.get('Origin');
    if (!origin) return next();
    if (!origins.has(origin)) return res.status(403).json({ error: 'Origem não autorizada.' });

    res.set('Access-Control-Allow-Origin', origin);
    if (req.method !== 'OPTIONS') return next();

    const requestedMethod = req.get('Access-Control-Request-Method');
    const requestedHeaders = (req.get('Access-Control-Request-Headers') || '')
      .split(',')
      .map((header) => header.trim().toLowerCase())
      .filter(Boolean);
    if (
      !methods.includes(requestedMethod) ||
      requestedHeaders.some((header) => !headers.includes(header))
    )
      return res.status(403).json({ error: 'Preflight não autorizado.' });

    res.vary('Access-Control-Request-Method');
    res.vary('Access-Control-Request-Headers');
    res.set('Access-Control-Allow-Methods', methods.join(', '));
    res.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    return res.sendStatus(204);
  };
}
