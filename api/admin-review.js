const { requireSession, requireAdmin, sb, json } = require('./_lib');
module.exports=async function(req,res){
 if(req.method!=='POST')return json(res,405,{error:'POST only'});
 try{
  const {profile}=await requireSession(req);requireAdmin(profile);const action=String(req.body?.action||'monthly-response');
  if(action==='engagement-list'){
   const tid=String(req.body?.telegramId||'');if(!tid)return json(res,400,{error:'telegramId required'});
   const replacements=await sb(`replacement_requests?telegram_id=eq.${encodeURIComponent(tid)}&order=created_at.desc&limit=30`);
   const checkins=await sb(`weekly_checkins?telegram_id=eq.${encodeURIComponent(tid)}&order=created_at.desc&limit=20`);
   return json(res,200,{replacements:replacements||[],checkins:checkins||[]});
  }
  const id=String(req.body?.id||'');if(!id)return json(res,400,{error:'id required'});
  if(action==='replacement-response'){
   const rows=await sb(`replacement_requests?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{trainer_reply:String(req.body?.feedback||''),status:'done'}});return json(res,200,{request:rows?.[0]});
  }
  if(action==='weekly-response'){
   const rows=await sb(`weekly_checkins?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{trainer_reply:String(req.body?.feedback||''),status:'done'}});return json(res,200,{checkin:rows?.[0]});
  }
  const rows=await sb(`monthly_reviews?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',prefer:'return=representation',body:{trainer_feedback:String(req.body?.feedback||''),status:'done',responded_at:new Date().toISOString()}});return json(res,200,{review:rows?.[0]});
 }catch(e){console.error('ADMIN_REVIEW_ERROR',e);return json(res,403,{error:e.message||'Admin response error'})}
};
