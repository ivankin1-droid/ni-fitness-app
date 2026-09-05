
const {requireSession,sb,json}=require('./_lib');
module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});
  try{
    const {profile}=await requireSession(req);
    const action=req.body?.action||'mine';
    if(action==='mine'){
      const rows=await sb(`monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&select=*&order=created_at.desc&limit=12`);
      return json(res,200,{reviews:rows||[]});
    }
    if(action==='submit'){
      const now=new Date();
      const month=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`;
      const existing=await sb(`monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&month=eq.${month}&select=id&limit=1`);
      if(existing?.length)return json(res,409,{error:'Отчёт за этот месяц уже отправлен.'});
      const created=await sb('monthly_reviews',{
        method:'POST',prefer:'return=representation',
        body:[{
          telegram_id:String(profile.telegram_id),month,
          win:req.body?.win||'',hard:req.body?.hard||'',next:req.body?.next||'',
          measurement:req.body?.measurement?JSON.stringify(req.body.measurement):null,status:'pending'
        }]
      });
      return json(res,200,{review:created[0]});
    }
    return json(res,400,{error:'Unknown action'});
  }catch(e){json(res,400,{error:e.message})}
};
