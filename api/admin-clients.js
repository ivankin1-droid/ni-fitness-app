const { requireSession, requireAdmin, sb, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { profile } = await requireSession(req);
    requireAdmin(profile);

    const clients = await sb('profiles?select=*&order=updated_at.desc&limit=500');
    const reviews = await sb(
      'monthly_reviews?select=*&status=eq.pending&order=created_at.desc&limit=100'
    );

    return json(res, 200, {
      clients: clients || [],
      reviews: reviews || []
    });
  } catch (error) {
    console.error('ADMIN_CLIENTS_ERROR', error);
    return json(res, 403, { error: error.message || 'Admin error' });
  }
};
