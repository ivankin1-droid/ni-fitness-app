const { requireSession, subscriptionActive, sb, json } = require('./_lib');

const APP_URL = (process.env.APP_URL || 'https://nifitnessminiappv3editable.vercel.app').replace(/\/+$/,'');
const TRAINER_URL = 'https://t.me/niatlet';

function demoActive(profile){
  if(!profile || !profile.demo_expires_at) return false;
  return new Date(profile.demo_expires_at).getTime() > Date.now();
}

async function tg(method, payload){
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if(!token) throw new Error('Missing TELEGRAM_BOT_TOKEN');

  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });

  const j = await r.json().catch(()=>({}));
  if(!r.ok || !j.ok) throw new Error(j.description || `Telegram ${method} error`);
  return j.result;
}

function mainKeyboard(){
  return {
    inline_keyboard:[
      [{text:'Открыть Personal Coach', web_app:{url:APP_URL}}],
      [{text:'Тарифы и доступ', web_app:{url:APP_URL}}],
      [{text:'Связаться с тренером', url:TRAINER_URL}]
    ]
  };
}

async function handleBotUpdate(update){
  const msg = update?.message;
  if(!msg?.chat?.id) return;

  const chatId = msg.chat.id;
  const command = String(msg.text || '').trim().split(/\s+/)[0].toLowerCase();

  if(command === '/start'){
    return tg('sendMessage',{
      chat_id:chatId,
      parse_mode:'HTML',
      text:`<b>PERSONAL COACH</b>

Твоя система питания, тренировок и контроля прогресса в одном месте.

В приложении:
• персональный рацион;
• тренировки и техника;
• вода и контроль прогресса;
• еженедельные чек-ины;
• отчёты тренеру;
• персональные корректировки.

Если подписки ещё нет — открой приложение, посмотри DEMO и выбери подходящий тариф.

<b>DISCIPLINE. CONSISTENCY. RESULT.</b>`,
      reply_markup:mainKeyboard()
    });
  }

  if(command === '/app'){
    return tg('sendMessage',{
      chat_id:chatId,
      text:'Открой Personal Coach:',
      reply_markup:{
        inline_keyboard:[
          [{text:'Открыть приложение', web_app:{url:APP_URL}}]
        ]
      }
    });
  }

  if(command === '/help'){
    return tg('sendMessage',{
      chat_id:chatId,
      parse_mode:'HTML',
      text:`<b>Помощь</b>

Если приложение не открывается — полностью закрой Mini App и запусти его снова из бота.

По вопросам подписки, питания и тренировок можно написать тренеру напрямую.`,
      reply_markup:{
        inline_keyboard:[
          [{text:'Открыть приложение', web_app:{url:APP_URL}}],
          [{text:'Связаться с тренером', url:TRAINER_URL}]
        ]
      }
    });
  }

  if(msg.text){
    return tg('sendMessage',{
      chat_id:chatId,
      text:'Основная работа проходит внутри Personal Coach.',
      reply_markup:mainKeyboard()
    });
  }
}

module.exports = async function handler(req, res) {
  // Telegram webhook uses the existing session endpoint.
  // This avoids creating an extra Vercel Function.
  if(req.method === 'POST' && req.body?.update_id){
    try{
      await handleBotUpdate(req.body);
      return json(res,200,{ok:true});
    }catch(error){
      console.error('BOT_WEBHOOK_ERROR', error?.message || error);
      return json(res,200,{ok:true});
    }
  }

  if(req.method !== 'POST'){
    return json(res,405,{error:'POST only'});
  }

  try{
    const {user,profile}=await requireSession(req);
    const action=String(req.body?.action || 'session');

    if(action === 'start-demo'){
      if(subscriptionActive(profile)){
        return json(res,200,{
          telegram_user_id:String(user.id),
          profile:{...profile,subscription_effective:true,demo_effective:false}
        });
      }

      if(profile.demo_used && !demoActive(profile)){
        return json(res,409,{
          error:'Демо уже использовано для этого Telegram-аккаунта.'
        });
      }

      if(!demoActive(profile)){
        const now=new Date();
        const expires=new Date(now.getTime()+60*60*1000);

        const rows=await sb(
          `profiles?telegram_id=eq.${encodeURIComponent(String(profile.telegram_id))}`,
          {
            method:'PATCH',
            prefer:'return=representation',
            body:{
              demo_used:true,
              demo_started_at:now.toISOString(),
              demo_expires_at:expires.toISOString(),
              updated_at:now.toISOString()
            }
          }
        );

        const p=rows?.[0] || profile;

        return json(res,200,{
          telegram_user_id:String(user.id),
          profile:{...p,subscription_effective:false,demo_effective:true}
        });
      }

      return json(res,200,{
        telegram_user_id:String(user.id),
        profile:{...profile,subscription_effective:false,demo_effective:true}
      });
    }

    return json(res,200,{
      telegram_user_id:String(user.id),
      profile:{
        ...profile,
        subscription_effective:subscriptionActive(profile),
        demo_effective:demoActive(profile)
      }
    });

  }catch(error){
    console.error('SESSION_ERROR', error?.message || error);
    return json(res,401,{
      error:error?.message || 'Session error'
    });
  }
};
