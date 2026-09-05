const { requireSession, sb, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { profile } = await requireSession(req);
    const action = (req.body && req.body.action) || 'mine';

    if (action === 'mine') {
      const rows = await sb(
        `monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&select=*&order=created_at.desc&limit=12`
      );
      return json(res, 200, { reviews: rows || [] });
    }

    if (action === 'submit') {
      const now = new Date();
      const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

      const existing = await sb(
        `monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&month=eq.${encodeURIComponent(month)}&select=id&limit=1`
      );

      if (Array.isArray(existing) && existing.length) {
        return json(res, 409, { error: 'Отчёт за этот месяц уже отправлен.' });
      }

      const measurement =
        req.body && req.body.measurement
          ? JSON.stringify(req.body.measurement)
          : null;

      const created = await sb('monthly_reviews', {
        method: 'POST',
        prefer: 'return=representation',
        body: [{
          telegram_id: String(profile.telegram_id),
          month,
          win: (req.body && req.body.win) || null,
          hard: (req.body && req.body.hard) || null,
          next: (req.body && req.body.next) || null,
          measurement,
          status: 'pending',
          trainer_feedback: null,
          responded_at: null
        }]
      });

      return json(res, 200, { review: created && created[0] });
    }

    return json(res, 400, { error: 'Unknown action' });
  } catch (error) {
    console.error('MONTHLY_REVIEW_ERROR', error);
    return json(res, 400, { error: error.message || 'Review error' });
  }
};
