const { requireSession, requireAdmin, sb, json } = require('./_lib');

const BUCKET='progress-photos';
function cfg(){return {base:process.env.SUPABASE_URL.replace(/\/$/,''),key:process.env.SUPABASE_SERVICE_ROLE_KEY}}
async function storageUpload(path,buf){
 const {base,key}=cfg();const r=await fetch(`${base}/storage/v1/object/${BUCKET}/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'image/jpeg','x-upsert':'false'},body:buf});
 if(!r.ok)throw new Error((await r.text())||'Storage upload failed');
}
async function signed(path){
 const {base,key}=cfg();const r=await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${path}`,{method:'POST',headers:{apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({expiresIn:3600})});
 const j=await r.json();if(!r.ok)throw new Error(j.message||'Signed URL failed');return `${base}/storage/v1${j.signedURL}`;
}

module.exports=async function handler(req,res){
 if(req.method!=='POST')return json(res,405,{error:'POST only'});
 try{
  const {profile}=await requireSession(req);requireAdmin(profile);
  const tid=String(req.body?.telegramId||'');if(!tid)return json(res,400,{error:'telegramId required'});
  const rows=await sb(`progress_photos?telegram_id=eq.${encodeURIComponent(tid)}&order=created_at.desc&limit=50`);
  const photos=[];for(const x of (Array.isArray(rows)?rows:[]))photos.push({...x,url:await signed(x.photo_path)});
  return json(res,200,{photos});
 }catch(e){console.error('ADMIN_PROGRESS_PHOTOS_ERROR',e);return json(res,403,{error:e.message||'Photo error'})}
};