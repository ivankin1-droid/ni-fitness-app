const { requireSession, requireAdmin, subscriptionActive, json } = require('./_lib');

const BUCKET='progress-photos';

function cfg(){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key) throw new Error('Supabase env missing');
  return {base,key};
}

async function db(path,{method='GET',body,prefer}={}){
  const {base,key}=cfg();
  const url=`${base}/rest/v1/${path}`;
  const headers={
    apikey:key,
    Authorization:`Bearer ${key}`,
    'Content-Type':'application/json'
  };
  if(prefer) headers.Prefer=prefer;
  const r=await fetch(url,{
    method,
    headers,
    body:body===undefined?undefined:JSON.stringify(body)
  });
  const raw=await r.text();
  let data=null;
  if(raw){try{data=JSON.parse(raw)}catch{data=raw}}
  if(!r.ok){
    console.error('PHOTO_DB_ERROR',url,r.status,data);
    throw new Error(typeof data==='object'&&data?(data.message||data.hint||JSON.stringify(data)):String(data||`DB ${r.status}`));
  }
  return data;
}

async function storageUpload(path,buf){
  const {base,key}=cfg();
  const url=`${base}/storage/v1/object/${BUCKET}/${path}`;
  const r=await fetch(url,{
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
    console.error('PHOTO_STORAGE_ERROR',url,r.status,raw);
    throw new Error(raw||'Storage upload failed');
  }
}

async function signed(path){
  const {base,key}=cfg();
  const url=`${base}/storage/v1/object/sign/${BUCKET}/${path}`;
  const r=await fetch(url,{
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
  const rows=await db(`progress_photos?telegram_id=eq.${encodeURIComponent(tid)}&select=*&order=created_at.desc&limit=${limit}`);
  const photos=[];
  for(const x of (Array.isArray(rows)?rows:[])){
    photos.push({...x,url:await signed(x.photo_path)});
  }
  return photos;
}

module.exports=async function handler(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST only'});

  try{
    const {profile}=await requireSession(req);
    const mode=String(req.body?.mode||'client');

    if(mode==='admin'){
      requireAdmin(profile);
      const tid=String(req.body?.telegramId||'');
      if(!tid) return json(res,400,{error:'telegramId required'});
      return json(res,200,{photos:await listPhotos(tid,50)});
    }

    if(!subscriptionActive(profile) && profile.role!=='admin'){
      return json(res,403,{error:'Подписка не активна.'});
    }

    const tid=String(profile.telegram_id);
    const action=String(req.body?.action||'list');

    if(action==='upload'){
      const data=String(req.body?.data||'');
      const m=data.match(/^data:image\/(?:jpeg|jpg|png|webp);base64,(.+)$/);
      if(!m) return json(res,400,{error:'Некорректное изображение.'});

      const buf=Buffer.from(m[1],'base64');
      if(buf.length>3500000) return json(res,400,{error:'Фото слишком большое.'});

      const objectPath=`${tid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;

      await storageUpload(objectPath,buf);

      const created=await db('progress_photos',{
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

    return json(res,200,{photos:await listPhotos(tid,30)});
  }catch(e){
    console.error('PROGRESS_PHOTOS_ERROR',e);
    return json(res,400,{error:e.message||'Photo error'});
  }
};