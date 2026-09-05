
const {requireSession,active,json}=require('./_lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req);
    json(res,200,{profile:{...profile,subscription_effective:active(profile)}});
  }catch(e){json(res,401,{error:e.message})}
};
