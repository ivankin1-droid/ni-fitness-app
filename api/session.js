const { requireSession, active, sb, json } = require('./_lib');

function demoActive(profile){
  if(!profile || !profile.demo_expires_at) return false;
  return new Date(profile.demo_expires_at).getTime() > Date.now();
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const { user, profile } = await requireSession(req);
    const action = String(req.body?.action || 'session');

    if (action === 'start-demo') {
      if (active(profile)) {
        return json(res, 200, {
          telegram_user_id: String(user.id),
          profile: {
            ...profile,
            subscription_effective: true,
            demo_effective: false
          }
        });
      }

      if (profile.demo_used && !demoActive(profile)) {
        return json(res, 409, {
          error: 'Демо уже использовано для этого Telegram-аккаунта.'
        });
      }

      if (!demoActive(profile)) {
        const now = new Date();
        const expires = new Date(now.getTime() + 60 * 60 * 1000);

        const rows = await sb(
          `profiles?telegram_id=eq.${encodeURIComponent(String(profile.telegram_id))}`,
          {
            method: 'PATCH',
            prefer: 'return=representation',
            body: {
              demo_used: true,
              demo_started_at: now.toISOString(),
              demo_expires_at: expires.toISOString(),
              updated_at: now.toISOString()
            }
          }
        );

        const p = rows?.[0] || profile;

        return json(res, 200, {
          telegram_user_id: String(user.id),
          profile: {
            ...p,
            subscription_effective: false,
            demo_effective: true
          }
        });
      }

      return json(res, 200, {
        telegram_user_id: String(user.id),
        profile: {
          ...profile,
          subscription_effective: false,
          demo_effective: true
        }
      });
    }

    return json(res, 200, {
      telegram_user_id: String(user.id),
      profile: {
        ...profile,
        subscription_effective: active(profile),
        demo_effective: demoActive(profile)
      }
    });
  } catch (error) {
    console.error('SESSION_ERROR', error?.message || error);
    return json(res, 401, {
      error: error?.message || 'Session error'
    });
  }
};
