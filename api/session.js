const { requireSession, subscriptionActive, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { user, profile } = await requireSession(req);
    return json(res, 200, {
      telegram_user_id: String(user.id),
      profile: {
        ...profile,
        subscription_effective: subscriptionActive(profile)
      }
    });
  } catch (error) {
    console.error('SESSION_ERROR', error && error.message ? error.message : error);
    return json(res, 401, {
      error: error && error.message ? error.message : 'Session error'
    });
  }
};
