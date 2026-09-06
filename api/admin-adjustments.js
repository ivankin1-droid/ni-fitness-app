const { requireSession, requireAdmin, sb, json } = require('./_lib');

module.exports = async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST only'});

  try{
    const {profile}=await requireSession(req);
    requireAdmin(profile);

    const telegramId=String(req.body?.telegramId||'');
    if(!telegramId) return json(res,400,{error:'telegramId required'});

    const action=String(req.body?.action||'list');

    if(action==='list'){
      const rows=await sb(`plan_adjustments?telegram_id=eq.${encodeURIComponent(telegramId)}&order=created_at.desc&limit=50`);
      return json(res,200,{adjustments:Array.isArray(rows)?rows:[]});
    }

    if(action==='delete'){
      const id=String(req.body?.id||'');
      if(!id) return json(res,400,{error:'id required'});

      const owned=await sb(`plan_adjustments?id=eq.${encodeURIComponent(id)}&telegram_id=eq.${encodeURIComponent(telegramId)}&select=id&limit=1`);
      if(!Array.isArray(owned)||!owned[0]) return json(res,404,{error:'Корректировка не найдена.'});

      await sb(`plan_adjustments?id=eq.${encodeURIComponent(id)}&telegram_id=eq.${encodeURIComponent(telegramId)}`,{
        method:'DELETE',
        prefer:'return=minimal'
      });

      return json(res,200,{ok:true});
    }

    if(action==='create'){
      const current=await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}&select=*&limit=1`);
      if(!Array.isArray(current)||!current[0]) return json(res,404,{error:'Клиент не найден.'});

      const oldKcal=Number(current[0].assigned_kcal||0)||null;
      const newKcal=Number(req.body?.newKcal);
      if(!Number.isFinite(newKcal)||newKcal<800||newKcal>6000) return json(res,400,{error:'Некорректная калорийность.'});

      const trainerComment=String(req.body?.trainerComment||'').trim();
      if(!trainerComment) return json(res,400,{error:'Добавьте комментарий клиенту.'});

      const effectiveFrom=String(req.body?.effectiveFrom||new Date().toISOString().slice(0,10));

      const created=await sb('plan_adjustments',{
        method:'POST',
        prefer:'return=representation',
        body:[{
          telegram_id:telegramId,
          adjustment_type:'nutrition',
          old_kcal:oldKcal,
          new_kcal:newKcal,
          trainer_comment:trainerComment,
          effective_from:effectiveFrom
        }]
      });

      const updated=await sb(`profiles?telegram_id=eq.${encodeURIComponent(telegramId)}`,{
        method:'PATCH',
        prefer:'return=representation',
        body:{assigned_kcal:newKcal,updated_at:new Date().toISOString()}
      });

      return json(res,200,{
        adjustment:Array.isArray(created)?created[0]:null,
        profile:updated[0]
      });
    }

    return json(res,400,{error:'Unknown action'});

  }catch(error){
    console.error('ADMIN_ADJUSTMENTS_ERROR',error);
    return json(res,403,{error:error.message||'Adjustment error'});
  }
};