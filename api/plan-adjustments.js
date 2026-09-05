const { requireSession, subscriptionActive, sb, json } = require('./_lib');

module.exports = async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req);
    if(!subscriptionActive(profile) && profile.role!=='admin') return json(res,403,{error:'Подписка не активна.'});
    const id=String(profile.telegram_id);
    const rows=await sb(`plan_adjustments?telegram_id=eq.${encodeURIComponent(id)}&order=created_at.desc&limit=10`);
    return json(res,200,{adjustments:Array.isArray(rows)?rows:[]});
  }catch(error){
    console.error('PLAN_ADJUSTMENTS_ERROR',error);
    return json(res,401,{error:error.message||'Adjustment error'});
  }
};