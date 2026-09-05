const { requireSession, requireAdmin, sb, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { profile } = await requireSession(req);
    requireAdmin(profile);

    const id = String((req.body && req.body.id) || '');
    if (!id) return json(res, 400, { error: 'review id required' });

    const rows = await sb(
      `monthly_reviews?id=eq.${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: {
          trainer_feedback: (req.body && req.body.feedback) || '',
          status: 'done',
          responded_at: new Date().toISOString()
        }
      }
    );

    return json(res, 200, { review: rows && rows[0] });
  } catch (error) {
    console.error('ADMIN_REVIEW_ERROR', error);
    return json(res, 403, { error: error.message || 'Review response error' });
  }
};
