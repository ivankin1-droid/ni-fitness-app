const { requireSession, requireAdmin, sb, json } = require('./_lib');
module.exports=async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'POST only'});
 try{
  const {profile}=await requireSession(req);requireAdmin(profile);
  const telegramId=String(req.body?.telegramId||'');if(!telegramId)return json(res,400,{error:'telegramId required'});
  const action=String(req.body?.action||'list');
  if(action==='list'){
   const rows=await sb(`training_plans?telegram_id=eq.${encodeURIComponent(telegramId)}&order=created_at.desc&limit=20`);
   return json(res,200,{plans:Array.isArray(rows)?rows:[]});
  }
  if(action==='create'){
   const planName=String(req.body?.planName||'').trim();
   const trainerComment=String(req.body?.trainerComment||'').trim();
   const days=Array.isArray(req.body?.days)?req.body.days:[];
   if(!planName||!days.length)return json(res,400,{error:'Заполни название и тренировочные дни.'});
   await sb(`training_plans?telegram_id=eq.${encodeURIComponent(telegramId)}&is_active=eq.true`,{method:'PATCH',prefer:'return=minimal',body:{is_active:false}});
   const rows=await sb('training_plans',{method:'POST',prefer:'return=representation',body:[{telegram_id:telegramId,plan_name:planName,trainer_comment:trainerComment,days,is_active:true}]});
   return json(res,200,{plan:Array.isArray(rows)?rows[0]:null});
  }
  return json(res,400,{error:'Unknown action'});
 }catch(e){console.error('ADMIN_TRAINING_ERROR',e);return json(res,403,{error:e.message||'Training plan error'})}
};