
const crypto = require('crypto');

function env(name){
  const v=process.env[name];
  if(!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}
function verifyTelegramInitData(initData){
  if(!initData) throw new Error('Откройте приложение внутри Telegram.');
  const params=new URLSearchParams(initData);
  const hash=params.get('hash');
  if(!hash) throw new Error('Telegram hash отсутствует.');
  params.delete('hash');

  const authDate=Number(params.get('auth_date')||0);
  const age=Math.floor(Date.now()/1000)-authDate;
  if(!authDate || age>86400 || age< -300) throw new Error('Telegram-сессия устарела. Откройте Mini App заново.');

  const dataCheck=[...params.entries()]
    .sort(([a],[b])=>a.localeCompare(b))
    .map(([k,v])=>`${k}=${v}`).join('\n');

  const secret=crypto.createHmac('sha256','WebAppData')
    .update(env('TELEGRAM_BOT_TOKEN')).digest();
  const calculated=crypto.createHmac('sha256',secret)
    .update(dataCheck).digest('hex');

  const a=Buffer.from(calculated,'hex'), b=Buffer.from(hash,'hex');
  if(a.length!==b.length || !crypto.timingSafeEqual(a,b)) throw new Error('Не удалось подтвердить Telegram-пользователя.');

  const userRaw=params.get('user');
  if(!userRaw) throw new Error('Telegram user отсутствует.');
  return JSON.parse(userRaw);
}

async function sb(path,{method='GET',body,prefer}={}){
  const url=env('SUPABASE_URL').replace(/\/$/,'')+'/rest/v1/'+path;
  const key=env('SUPABASE_SERVICE_ROLE_KEY');
  const headers={
    'apikey':key,
    'Authorization':'Bearer '+key,
    'Content-Type':'application/json'
  };
  if(prefer) headers['Prefer']=prefer;
  const r=await fetch(url,{method,headers,body:body?JSON.stringify(body):undefined});
  const text=await r.text();
  let data=null;
  if(text){try{data=JSON.parse(text)}catch{data=text}}
  if(!r.ok) throw new Error(typeof data==='object'?(data.message||data.hint||JSON.stringify(data)):String(data));
  return data;
}

async function getOrCreateProfile(user){
  const id=String(user.id);
  let rows=await sb(`profiles?telegram_id=eq.${encodeURIComponent(id)}&select=*`);
  if(rows?.[0]) return rows[0];

  const created=await sb('profiles?on_conflict=telegram_id',{
    method:'POST',
    prefer:'resolution=merge-duplicates,return=representation',
    body:[{
      telegram_id:id,
      username:user.username||null,
      first_name:user.first_name||null,
      last_name:user.last_name||null,
      role:'client',
      assigned_kcal:1500,
      subscription_active:false,
      allowed_materials:['nutrition','products','protein','goals','labels']
    }]
  });
  return created?.[0];
}
async function requireSession(req){
  const initData=req.body?.initData || req.headers['x-telegram-init-data'];
  const user=verifyTelegramInitData(initData);
  const profile=await getOrCreateProfile(user);
  return {user,profile};
}
function active(profile){
  if(!profile.subscription_active) return false;
  if(!profile.subscription_until) return true;
  return new Date(profile.subscription_until).getTime()>Date.now();
}
function requireAdmin(profile){
  if(profile.role!=='admin') throw new Error('Нет прав администратора.');
}
function json(res,status,data){res.status(status).json(data)}

module.exports={verifyTelegramInitData,sb,getOrCreateProfile,requireSession,active,requireAdmin,json};
