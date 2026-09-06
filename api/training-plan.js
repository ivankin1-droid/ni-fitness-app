const { requireSession, active, sb, json } = require('./_lib');

module.exports=async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST only'});

  try{
    const {profile}=await requireSession(req);
    const photoAction=String(req.body?.photoAction||'');

    // PHOTO: list for ADMIN
    if(photoAction==='admin-list'){
      if(profile.role!=='admin') return json(res,403,{error:'Нет прав администратора.'});
      const tid=String(req.body?.telegramId||'');
      if(!tid) return json(res,400,{error:'telegramId required'});

      const rows=await sb(
        `progress_photos?telegram_id=eq.${encodeURIComponent(tid)}&select=id,telegram_id,photo_path,photo_type,note,created_at&order=created_at.desc&limit=30`
      );
      return json(res,200,{
        photos:(Array.isArray(rows)?rows:[]).map(x=>({...x,url:x.photo_path}))
      });
    }

    // PHOTO: list for client
    if(photoAction==='list'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});

      const rows=await sb(
        `progress_photos?telegram_id=eq.${encodeURIComponent(String(profile.telegram_id))}&select=id,telegram_id,photo_path,photo_type,note,created_at&order=created_at.desc&limit=30`
      );
      return json(res,200,{
        photos:(Array.isArray(rows)?rows:[]).map(x=>({...x,url:x.photo_path}))
      });
    }

    // PHOTO: upload as compressed data URL directly to DB
    if(photoAction==='upload'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});

      const data=String(req.body?.data||'');
      if(!/^data:image\/jpeg;base64,/i.test(data))
        return json(res,400,{error:'Некорректное изображение.'});

      if(data.length>2200000)
        return json(res,400,{error:'Фото слишком большое. Попробуйте другое фото.'});

      const created=await sb('progress_photos',{
        method:'POST',
        prefer:'return=representation',
        body:[{
          telegram_id:String(profile.telegram_id),
          photo_path:data,
          photo_type:String(req.body?.photoType||'progress'),
          note:String(req.body?.note||'')
        }]
      });

      const photo=Array.isArray(created)?created[0]:null;
      return json(res,200,{photo:photo?{...photo,url:photo.photo_path}:null});
    }

    // ORIGINAL TRAINING PLAN
    if(!active(profile)&&profile.role!=='admin')
      return json(res,403,{error:'Подписка не активна.'});

    const code=String(profile.tariff_code||'');
    if(profile.role!=='admin'&&!['1490','2990'].includes(code))
      return json(res,403,{error:'Тренировочный план доступен в PRO и PREMIUM.'});

    const rows=await sb(
      `training_plans?telegram_id=eq.${encodeURIComponent(String(profile.telegram_id))}&is_active=eq.true&order=created_at.desc&limit=1`
    );

    return json(res,200,{plan:Array.isArray(rows)&&rows[0]?rows[0]:null});
  }catch(e){
    console.error('TRAINING_OR_PHOTO_ERROR',e);
    return json(res,400,{error:e.message||'Ошибка сервера'});
  }
};