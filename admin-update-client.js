
const {requireSession,requireAdmin,sb,json}=require('./_lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req); requireAdmin(profile);
    const telegramId=String(req.body?.telegramId||'');
    if(!telegramId)return json(res,400,{error:'telegramId required'});
    const patch={updated_at:new Date().toISOString()};
    if(req.body.assignedKcal!=null)patch.assigned_kcal=Number(req.body.assignedKcal);
    if(req.body.subscriptionActive!=null)patch.subscription_active=!!req.body.subscriptionActive;
    if(req.body.subscriptionUntil!==undefined)patch.subscription_until=req.body.subscriptionUntil||null;
    if(Array.isArray(req.body.allowedMaterials))patch.allowed_materials=req.body.allowedMaterials;

    const rows=await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}`,{
      method:'PATCH',prefer:'return=representation',body:patch
    });
    if(!rows?.length)return json(res,404,{error:'Клиент не найден'});
    json(res,200,{profile:rows[0]});
  }catch(e){json(res,403,{error:e.message})}
};
