
const {requireSession,requireAdmin,sb,json}=require('./_lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req); requireAdmin(profile);
    const clients=await sb('profiles?select=*&order=updated_at.desc&limit=500');
    const reviews=await sb('monthly_reviews?select=*&status=eq.pending&order=created_at.desc&limit=100');
    json(res,200,{clients,reviews});
  }catch(e){json(res,403,{error:e.message})}
};
