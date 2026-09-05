const { requireSession, subscriptionActive, sb, json } = require('./_lib');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'POST only'});
 try{
  const {profile}=await requireSession(req);
  if(!subscriptionActive(profile)&&profile.role!=='admin')return json(res,403,{error:'Подписка не активна.'});
  const code=String(profile.tariff_code||'');
  if(profile.role!=='admin'&&!['1490','2990'].includes(code))return json(res,403,{error:'Тренировочный план доступен в PRO и PREMIUM.'});
  const rows=await sb(`training_plans?telegram_id=eq.${encodeURIComponent(String(profile.telegram_id))}&is_active=eq.true&order=created_at.desc&limit=1`);
  return json(res,200,{plan:Array.isArray(rows)&&rows[0]?rows[0]:null});
 }catch(e){console.error('TRAINING_PLAN_ERROR',e);return json(res,401,{error:e.message||'Training plan error'})}
};