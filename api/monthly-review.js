const { requireSession, subscriptionActive, sb, json } = require('./_lib');
function mondayISO(){const d=new Date();const day=(d.getUTCDay()+6)%7;d.setUTCDate(d.getUTCDate()-day);return d.toISOString().slice(0,10)}
module.exports=async function(req,res){
 if(req.method!=='POST')return json(res,405,{error:'POST only'});
 try{
  const {profile}=await requireSession(req);
  if(!subscriptionActive(profile)&&profile.role!=='admin'){
    const demo=profile.demo_expires_at&&new Date(profile.demo_expires_at).getTime()>Date.now();
    if(!demo)return json(res,403,{error:'Подписка не активна.'});
  }
  const action=String(req.body?.action||'mine'),tid=String(profile.telegram_id);
  if(action==='mine'){const rows=await sb(`monthly_reviews?telegram_id=eq.${encodeURIComponent(tid)}&select=*&order=created_at.desc&limit=12`);return json(res,200,{reviews:rows||[]})}
  if(action==='submit'){
   const now=new Date(),month=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`;
   const existing=await sb(`monthly_reviews?telegram_id=eq.${encodeURIComponent(tid)}&month=eq.${month}&select=id&limit=1`);
   if(existing?.length)return json(res,409,{error:'Отчёт за этот месяц уже отправлен.'});
   const created=await sb('monthly_reviews',{method:'POST',prefer:'return=representation',body:[{telegram_id:tid,month,win:req.body?.win||'',hard:req.body?.hard||'',next:req.body?.next||'',measurement:req.body?.measurement||null,status:'на проверке'}]});
   return json(res,200,{review:created?.[0]});
  }
  if(action==='replacement-list'){const rows=await sb(`replacement_requests?telegram_id=eq.${encodeURIComponent(tid)}&order=created_at.desc&limit=20`);return json(res,200,{requests:rows||[]})}
  if(action==='replacement-create'){
   const type=String(req.body?.requestType||'food'); if(!['food','exercise'].includes(type))return json(res,400,{error:'Некорректный тип запроса.'});
   const msg=String(req.body?.message||'').trim(); if(!msg)return json(res,400,{error:'Напишите, что хотите заменить.'});
   const rows=await sb('replacement_requests',{method:'POST',prefer:'return=representation',body:[{
     telegram_id:tid,
     request_type:type,
     current_item:String(req.body?.currentItem||''),
     reason:msg,
     trainer_reply:null,
     replacement_item:null,
     status:'pending'
   }]});
   return json(res,200,{request:rows?.[0]});
  }
  if(action==='weekly-list'){
   const rows=await sb(`weekly_checkins?telegram_id=eq.${encodeURIComponent(tid)}&order=created_at.desc&limit=12`);
   return json(res,200,{checkins:rows||[]});
  }
  if(action==='weekly-submit'){
   const now=new Date();
   const day=(now.getUTCDay()+6)%7;
   const monday=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()-day,0,0,0));
   const mondayIso=monday.toISOString();
   const ex=await sb(`weekly_checkins?telegram_id=eq.${encodeURIComponent(tid)}&created_at=gte.${encodeURIComponent(mondayIso)}&select=id&limit=1`);
   if(ex?.length)return json(res,409,{error:'Чек-ин за эту неделю уже отправлен.'});
   const rows=await sb('weekly_checkins',{method:'POST',prefer:'return=representation',body:[{
     telegram_id:tid,
     weight:req.body?.weight||null,
     nutrition_score:Number(req.body?.nutritionScore)||null,
     workouts_done:Number(req.body?.trainingCount)||0,
     sleep:Number(req.body?.sleepScore)||null,
     wellbeing:Number(req.body?.wellbeingScore)||null,
     successes:String(req.body?.win||''),
     difficulties:String(req.body?.hard||''),
     question:String(req.body?.question||''),
     trainer_reply:null,
     status:'pending'
   }]});
   return json(res,200,{checkin:rows?.[0]});
  }
  return json(res,400,{error:'Unknown action'});
 }catch(e){console.error('ENGAGEMENT_ERROR',e);return json(res,400,{error:e.message||'Ошибка сервера'})}
};
