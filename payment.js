(()=>{
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
try{Telegram.WebApp.ready();Telegram.WebApp.expand()}catch(e){}
const initData=()=>window.Telegram?.WebApp?.initData||'';

async function post(path,body={}){
  const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:initData(),...body})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.error||'Ошибка оплаты');
  return j;
}

async function load(){
  if(!initData()){
    $('#paymentStatus').textContent='Откройте оплату из Mini App в Telegram.';
    $$('.pay').forEach(b=>b.disabled=true);
    return;
  }
  try{
    const s=await post('/api/session');
    const p=s.profile;
    const until=p.subscription_until?new Date(p.subscription_until).toLocaleDateString('ru-RU'):'—';
    $('#paymentStatus').textContent=`Telegram ID ${p.telegram_id} · текущий доступ до ${until}`;
  }catch(e){
    $('#paymentStatus').textContent=e.message;
    $$('.pay').forEach(b=>b.disabled=true);
  }
}

$$('.pay').forEach(btn=>btn.onclick=async()=>{
  const original=btn.textContent;
  $$('.pay').forEach(b=>b.disabled=true);
  btn.textContent='Создаём платёж…';
  try{
    const r=await post('/api/tbank-init',{tariff:btn.dataset.tariff});
    if(!r.paymentUrl)throw new Error('Т-Банк не вернул ссылку на оплату.');
    try{
      if(window.Telegram?.WebApp?.openLink)Telegram.WebApp.openLink(r.paymentUrl);
      else location.href=r.paymentUrl;
    }catch(e){location.href=r.paymentUrl}
  }catch(e){
    alert(e.message||'Не удалось создать платёж');
    $$('.pay').forEach(b=>b.disabled=false);
    btn.textContent=original;
  }
});
load();
})();