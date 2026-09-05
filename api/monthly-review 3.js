const { requireSession, requireAdmin, active, sb, json } = require('./_lib');

const BUCKET='progress-photos';

function cfg(){
  const base=String(process.env.SUPABASE_URL||'').replace(/\/+$/,'');
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
  if(!base||!key) throw new Error('Supabase environment variables are missing');
  return {base,key};
}

function encObjectPath(path){
  return String(path).split('/').map(encodeURIComponent).join('/');
}

async function storageFetch(relativePath,{method='POST',body,contentType='application/json'}={}){
  const {base,key}=cfg();
  const url=`${base}/storage/v1/${relativePath}`;
  const headers={
    apikey:key,
    Authorization:`Bearer ${key}`
  };
  if(contentType) headers['Content-Type']=contentType;

  const r=await fetch(url,{
    method,
    headers,
    body:body===undefined?undefined:(Buffer.isBuffer(body)?body:JSON.stringify(body))
  });

  const raw=await r.text();
  let data=null;
  if(raw){try{data=JSON.parse(raw)}catch{data=raw}}

  if(!r.ok){
    console.error('STORAGE_REQUEST_FAILED',{url,status:r.status,data});
    const msg=(data&&typeof data==='object'&&(data.message||data.error))||String(data||`Storage ${r.status}`);
    throw new Error(msg);
  }
  return data;
}

async function uploadPhoto(tid,dataUrl){
  const m=String(dataUrl||'').match(/^data:image\/(?:jpeg|jpg|png|webp);base64,(.+)$/);
  if(!m) throw new Error('Некорректное изображение.');

  const buf=Buffer.from(m[1],'base64');
  if(buf.length>3500000) throw new Error('Фото слишком большое.');

  const objectPath=`${tid}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
  const safePath=encObjectPath(objectPath);

  await storageFetch(`object/${encodeURIComponent(BUCKET)}/${safePath}`,{
    method:'POST',
    body:buf,
    contentType:'image/jpeg'
  });

  return objectPath;
}

async function signedUrl(objectPath){
  const safePath=encObjectPath(objectPath);
  const j=await storageFetch(`object/sign/${encodeURIComponent(BUCKET)}/${safePath}`,{
    method:'POST',
    body:{expiresIn:3600}
  });

  const u=j?.signedURL||j?.signedUrl;
  if(!u) throw new Error('Не удалось получить ссылку на фото.');

  const {base}=cfg();
  return u.startsWith('http') ? u : `${base}/storage/v1${u}`;
}

async function listPhotos(tid,limit=30){
  const rows=await storageFetch(`object/list/${encodeURIComponent(BUCKET)}`,{
    method:'POST',
    body:{
      prefix:`${tid}/`,
      limit,
      offset:0,
      sortBy:{column:'created_at',order:'desc'}
    }
  });

  const photos=[];
  for(const o of (Array.isArray(rows)?rows:[])){
    if(!o?.name) continue;

    // Supabase list() may return just the filename for a prefix query.
    const objectPath=o.name.startsWith(`${tid}/`) ? o.name : `${tid}/${o.name}`;

    photos.push({
      id:o.id||objectPath,
      photo_path:objectPath,
      created_at:o.created_at||o.updated_at||null,
      url:await signedUrl(objectPath)
    });
  }
  return photos;
}

module.exports=async function(req,res){
  if(req.method!=='POST') return json(res,405,{error:'POST only'});

  try{
    const {profile}=await requireSession(req);

    // PHOTO ACTIONS: separate namespace so monthly-review actions don't conflict.
    const photoAction=String(req.body?.photoAction||'');

    if(photoAction==='admin-list'){
      requireAdmin(profile);
      const tid=String(req.body?.telegramId||'');
      if(!tid) return json(res,400,{error:'telegramId required'});
      return json(res,200,{photos:await listPhotos(tid,50)});
    }

    if(photoAction==='list'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});

      return json(res,200,{photos:await listPhotos(String(profile.telegram_id),30)});
    }

    if(photoAction==='upload'){
      if(!active(profile) && profile.role!=='admin')
        return json(res,403,{error:'Подписка не активна.'});

      const objectPath=await uploadPhoto(String(profile.telegram_id),req.body?.data);

      return json(res,200,{
        photo:{
          photo_path:objectPath,
          created_at:new Date().toISOString(),
          url:await signedUrl(objectPath)
        }
      });
    }

    // MONTHLY REVIEW ACTIONS
    const action=String(req.body?.action||'mine');

    if(action==='mine'){
      const rows=await sb(
        `monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&select=*&order=created_at.desc&limit=12`
      );
      return json(res,200,{reviews:rows||[]});
    }

    if(action==='submit'){
      const now=new Date();
      const month=`${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`;

      const existing=await sb(
        `monthly_reviews?telegram_id=eq.${encodeURIComponent(profile.telegram_id)}&month=eq.${encodeURIComponent(month)}&select=id&limit=1`
      );
      if(Array.isArray(existing)&&existing.length){
        return json(res,409,{error:'Отчёт за этот месяц уже отправлен.'});
      }

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

      return json(res,200,{review:created?.[0]});
    }

    return json(res,400,{error:'Unknown action'});
  }catch(e){
    console.error('MONTHLY_REVIEW_PHOTO_ERROR',e);
    return json(res,400,{error:e.message||'Ошибка сервера'});
  }
};
