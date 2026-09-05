const crypto = require('crypto');

function env(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value.trim();
}

function supabaseBaseUrl() {
  let url = env('SUPABASE_URL').replace(/\/+$/, '');
  // Allows either https://xxx.supabase.co or a copied Data API URL ending in /rest/v1
  url = url.replace(/\/rest\/v1\/?$/i, '');
  return url;
}

function supabaseKey() {
  // Accept the name used in our Vercel setup, plus a fallback alias.
  return (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '').trim();
}

function verifyTelegramInitData(initData) {
  if (!initData) throw new Error('Telegram initData отсутствует.');

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  if (!hash) throw new Error('Telegram hash отсутствует.');

  params.delete('hash');

  const authDate = Number(params.get('auth_date') || 0);
  const now = Math.floor(Date.now() / 1000);
  if (!authDate || Math.abs(now - authDate) > 86400) {
    throw new Error('Telegram-сессия устарела. Откройте Mini App заново.');
  }

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(env('TELEGRAM_BOT_TOKEN'))
    .digest();

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  const a = Buffer.from(calculatedHash, 'hex');
  const b = Buffer.from(hash, 'hex');

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new Error('Telegram initData не прошёл проверку подписи. Проверьте токен именно этого бота.');
  }

  const rawUser = params.get('user');
  if (!rawUser) throw new Error('Telegram user отсутствует.');
  return JSON.parse(rawUser);
}

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const key = supabaseKey();
  if (!key) throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');

  const url = `${supabaseBaseUrl()}/rest/v1/${path}`;
  const headers = {
    apikey: key,
    'Content-Type': 'application/json'
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });

  const raw = await response.text();
  let data = null;
  if (raw) {
    try { data = JSON.parse(raw); }
    catch { data = raw; }
  }

  if (!response.ok) {
    let details =
      typeof data === 'object' && data
        ? (data.message || data.hint || data.code || JSON.stringify(data))
        : String(data || '');
    throw new Error(`Supabase ${response.status}: ${details || 'request failed'}`);
  }

  return data;
}

async function getOrCreateProfile(user) {
  const telegramId = String(user.id);

  const existing = await sb(
    `profiles?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&limit=1`
  );
  if (Array.isArray(existing) && existing[0]) return existing[0];

  const created = await sb('profiles', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{
      telegram_id: telegramId,
      username: user.username || null,
      first_name: user.first_name || null,
      last_name: user.last_name || null,
      role: 'client',
      assigned_kcal: 1500,
      subscription_active: false,
      subscription_until: null,
      allowed_materials: ['nutrition','products','protein','goals','labels'],
      updated_at: new Date().toISOString()
    }]
  });

  if (!Array.isArray(created) || !created[0]) {
    throw new Error('Supabase не вернул созданный профиль.');
  }
  return created[0];
}

async function requireSession(req) {
  const initData =
    (req.body && req.body.initData) ||
    req.headers['x-telegram-init-data'];

  const user = verifyTelegramInitData(initData);
  const profile = await getOrCreateProfile(user);
  return { user, profile };
}

function subscriptionActive(profile) {
  if (!profile || !profile.subscription_active) return false;
  if (!profile.subscription_until) return true;
  return new Date(profile.subscription_until).getTime() > Date.now();
}

function requireAdmin(profile) {
  if (!profile || profile.role !== 'admin') {
    throw new Error('Нет прав администратора.');
  }
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

module.exports = { sb, requireSession, subscriptionActive, requireAdmin, json };
