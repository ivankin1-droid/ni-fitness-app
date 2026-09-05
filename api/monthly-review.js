const {requireSession,sb,active,requireAdmin,json}=require('./_lib');

const BUCKET='progress-photos';

function cfg(){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key) throw new Error('Supabase env missing');
  return {base,key};
}

async function storageUpload(path,buf){
  const {base,key}=cfg();
  const r=await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`,{
    method:'POST',
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      'Content-Type':'image/jpeg',
      'x-upsert':'false'
    },
    body:buf
  });
  const raw=await r.text();
  if(!r.ok){
    console.error('PHOTO_STORAGE_ERROR',r.status,raw);
    throw new Error(raw||'Storage upload failed');
  }
}

async function signed(path){
  const {base,key}=cfg();
  const r=await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${path}`,{
    method:'POST',
    headers:{
      apikey:key,
      Authorization:`Bearer ${key}`,
      'Content-Type':'application/json'
    },
    body:JSON.stringify({expiresIn:3600})
  });
  const raw=await r.text();
  let j={};try{j=raw?JSON.parse(raw):{}}catch{}
  if(!r.ok) throw new Error(j.message||j.error||raw||'Signed URL failed');
  const u=j.signedURL||j.signedUrl;
  if(!u) throw new Error('Signed URL missing');
  return u.startsWith('http')?u:`${base}/storage/v1${u}`;
}

async function listPhotos(tid,limit){
  const rows=await sb(`progress_photos?telegram_id=eq.${encodeURIComponent(tid)}&select=*&order=created_at.desc&limit=${limit}`);
  const photos=[];
  for(const x of (Array.isArray(rows)?rows:[])){
    photos.push({...x,url:await signed(x.photo_path)});
  }
  return photos;
}

module.exports=async function(req,res){
  if(req.method!=='POST')return json(res,405,{error:'POST only'});

  try{
    const {profile}=await requireSession(req);
    const action=String(req.body?.action||'mine');

    // ===== PHOTO ACTIONS =====
    if(action==='photos-admin'){
      requireAdmin(profile);
      const tid=String(req.body?.telegramId||'');
      if(!tid)return json(res,400,{error:'telegramId required'});
      return json(res,200,{photos:await listPhotos(tid,50)});
    }

    if(action==='list'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});
      return json(res,200,{photos:await listPhotos(String(profile.telegram_id),30)});
    }

    if(action==='upload'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});

      const data=String(req.body?.data||'');
      const m=data.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,(.+)$/);
      if(!m)return json(res,400,{error:'Некорректное изображение.'});

      const buf=Buffer.from(m[1],'base64');
      if(buf.length>3500000)return json(res,400,{error:'Фото слишком большое.'});

      const tid=String(profile.telegram_id);
      const objectPath=`${tid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;

      await storageUpload(objectPath,buf);

      const created=await sb('progress_photos',{
        method:'POST',
        prefer:'return=representation',
        body:[{
          telegram_id:tid,
          photo_path:objectPath,
          photo_type:String(req.body?.photoType||'progress'),
          note:String(req.body?.note||'')
        }]
      });

      return json(res,200,{photo:Array.isArray(created)?created[0]:null});
    }

    // ===== ORIGINAL MONTHLY REVIEW ACTIONS =====
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
        method:'POST',
        prefer:'return=representation',
        body:[{
          telegram_id:String(profile.telegram_id),
          month,
          win:req.body?.win||'',
          hard:req.body?.hard||'',
          next:req.body?.next||'',
          measurement:req.body?.measurement?JSON.stringify(req.body.measurement):null,
          status:'pending'
        }]
      });
      return json(res,200,{review:created[0]});
    }

    return json(res,400,{error:'Unknown action'});
  }catch(e){
    console.error('MONTHLY_REVIEW_OR_PHOTO_ERROR',e);
    return json(res,400,{error:e.message||'Ошибка сервера'});
  }
};
