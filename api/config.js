/*
 * Configuración pública de runtime para el cliente web.
 * Solo expone URL y clave publishable/anon. Nunca devuelve service_role
 * ni SUPABASE_SECRET_KEY. Si faltan variables, el entorno queda desconectado.
 */
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    '';

  let validUrl = false;
  try {
    const parsed = new URL(supabaseUrl);
    validUrl =
      parsed.protocol === 'https:' &&
      parsed.hostname.endsWith('.supabase.co') &&
      parsed.username === '' &&
      parsed.password === '';
  } catch (_) {}

  // Las claves publishable nuevas empiezan por sb_publishable_.
  // Para claves anon heredadas, verificar que el JWT declare role=anon.
  let validPublicKey = supabaseKey.startsWith('sb_publishable_');
  if (!validPublicKey) {
    try {
      const payload = JSON.parse(
        Buffer.from(supabaseKey.split('.')[1] || '', 'base64url').toString('utf8')
      );
      validPublicKey = payload.role === 'anon';
    } catch (_) {}
  }

  if (!validUrl || !validPublicKey) {
    return res.status(503).json({ error: 'runtime_configuration_unavailable' });
  }

  return res.status(200).json({
    supabaseUrl,
    supabaseKey
  });
};
