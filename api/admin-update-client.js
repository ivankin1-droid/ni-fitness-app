const { requireSession, requireAdmin, sb, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { profile } = await requireSession(req);
    requireAdmin(profile);

    const telegramId = String((req.body && req.body.telegramId) || '');
    if (!telegramId) return json(res, 400, { error: 'telegramId required' });

    const patch = { updated_at: new Date().toISOString() };

    if (req.body.tariffCode !== undefined) {
      const tariffCode = Number(req.body.tariffCode);
      if (![690, 1490, 2990].includes(tariffCode)) {
        return json(res, 400, { error: 'Неизвестный тариф.' });
      }
      patch.tariff_code = tariffCode;
    }

    if (req.body.assignedKcal !== undefined) {
      patch.assigned_kcal = Number(req.body.assignedKcal);
    }
    if (req.body.subscriptionActive !== undefined) {
      patch.subscription_active = Boolean(req.body.subscriptionActive);
    }
    if (req.body.subscriptionUntil !== undefined) {
      patch.subscription_until = req.body.subscriptionUntil || null;
    }
    if (Array.isArray(req.body.allowedMaterials)) {
      patch.allowed_materials = req.body.allowedMaterials;
    }

    const rows = await sb(
      `profiles?telegram_id=eq.${encodeURIComponent(telegramId)}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: patch
      }
    );

    if (!Array.isArray(rows) || !rows.length) {
      return json(res, 404, { error: 'Клиент не найден.' });
    }

    return json(res, 200, { profile: rows[0] });
  } catch (error) {
    console.error('ADMIN_UPDATE_ERROR', error);
    return json(res, 403, { error: error.message || 'Update error' });
  }
};
