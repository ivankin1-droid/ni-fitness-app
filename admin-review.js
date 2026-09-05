
const {requireSession,requireAdmin,sb,json}=require('./_lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req); requireAdmin(profile);
    const id=String(req.body?.id||'');
    if(!id)return json(res,400,{error:'review id required'});
    const rows=await sb(`monthly_reviews?id=eq.${encodeURIComponent(id)}`,{
      method:'PATCH',prefer:'return=representation',
      body:{
        trainer_feedback:req.body?.feedback||'',
        status:'разбор готов',
        responded_at:new Date().toISOString()
      }
    });
    json(res,200,{review:rows?.[0]});
  }catch(e){json(res,403,{error:e.message})}
};
