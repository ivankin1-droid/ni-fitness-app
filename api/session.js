const { requireSession, subscriptionActive, json } = require('./_lib');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { profile } = await requireSession(req);
    return json(res, 200, {
      profile: {
        ...profile,
        subscription_effective: subscriptionActive(profile)
      }
    });
  } catch (error) {
    console.error('SESSION_ERROR', error);
    return json(res, 401, { error: error.message || 'Session error' });
  }
};
