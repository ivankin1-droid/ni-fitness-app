
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
let CLIENTS=[],REVIEWS=[];
try{Telegram.WebApp.ready();Telegram.WebApp.expand()}catch(e){}
const initData=()=>window.Telegram?.WebApp?.initData||'';
async function post(path,body={}){
 const r=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:initData(),...body})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка');return j;
}
function fmtDate(s){return s?new Date(s).toLocaleDateString('ru-RU'):'без срока'}
async function load(){
 try{
  const s=await post('/api/session');
  if(s.profile.role!=='admin')throw new Error('Этот Telegram-профиль не назначен администратором.');
  $('#adminStatus').textContent=`Администратор · Telegram ID ${s.profile.telegram_id}`;
  const d=await post('/api/admin-clients');CLIENTS=d.clients||[];REVIEWS=d.reviews||[];
  renderClients();renderReviews();
 }catch(e){$('#adminStatus').textContent=e.message;$('#clientList').innerHTML=`<div class="notice">${e.message}</div>`}
}
function renderClients(){
 const q=$('#clientSearch').value.trim().toLowerCase();
 const rows=CLIENTS.filter(c=>!q||String(c.telegram_id).includes(q)||String(c.username||'').toLowerCase().includes(q)||String(c.first_name||'').toLowerCase().includes(q));
 $('#clientList').innerHTML=rows.map(c=>`<button class="admin-client" data-id="${c.telegram_id}">
  <div><b>${c.first_name||'Без имени'} ${c.last_name||''}</b><small>@${c.username||'—'} · ID ${c.telegram_id}</small></div>
  <div class="admin-client-meta"><span>${c.assigned_kcal} ккал</span><span class="${c.subscription_active?'good':'bad'}">${c.subscription_active?'ACTIVE':'PAUSED'}</span></div>
 </button>`).join('')||'<div class="notice">Клиентов пока нет.</div>';
 $$('[data-id]').forEach(b=>b.onclick=()=>openClient(b.dataset.id));
}
function openClient(id){
 const c=CLIENTS.find(x=>String(x.telegram_id)===String(id));if(!c)return;
 $('#clientDetail').innerHTML=`<span class="eyebrow">CLIENT</span><h2>${c.first_name||'Клиент'} ${c.last_name||''}</h2>
 <div class="profile-summary">Telegram ID: <b>${c.telegram_id}</b><br>@${c.username||'—'}</div>
 <label>Назначенный план<select id="adminKcal">${[1200,1500,1800,2000,2200,2500,3000,3200,3500,4000].map(k=>`<option ${Number(c.assigned_kcal)===k?'selected':''}>${k}</option>`).join('')}</select></label>
 <label class="switch-row"><span>Подписка активна</span><input id="adminSubActive" type="checkbox" ${c.subscription_active?'checked':''}></label>
 <label>Доступ до<input id="adminSubUntil" type="date" value="${c.subscription_until?c.subscription_until.slice(0,10):''}"></label>
 <div class="detail-section"><h4>Материалы</h4>
 ${['nutrition','products','protein','goals','labels'].map(x=>`<label class="switch-row"><span>${x}</span><input type="checkbox" data-mat="${x}" ${(c.allowed_materials||[]).includes(x)?'checked':''}></label>`).join('')}
 </div><button class="primary wide" id="saveClientAccess">Сохранить доступ</button>`;
 $('#clientModal').classList.add('open');
 $('#saveClientAccess').onclick=async()=>{
  const mats=$$('[data-mat]').filter(x=>x.checked).map(x=>x.dataset.mat);
  const until=$('#adminSubUntil').value?new Date($('#adminSubUntil').value+'T23:59:59').toISOString():null;
  try{
   const r=await post('/api/admin-update-client',{telegramId:c.telegram_id,assignedKcal:+$('#adminKcal').value,subscriptionActive:$('#adminSubActive').checked,subscriptionUntil:until,allowedMaterials:mats});
   const i=CLIENTS.findIndex(x=>String(x.telegram_id)===String(c.telegram_id));CLIENTS[i]=r.profile;
   $('#clientModal').classList.remove('open');renderClients();
  }catch(e){alert(e.message)}
 };
}
function renderReviews(){
 $('#reviewList').innerHTML=REVIEWS.map(r=>`<button class="admin-client" data-review="${r.id}">
 <div><b>ID ${r.telegram_id}</b><small>${new Date(r.created_at).toLocaleDateString('ru-RU')} · ${r.status}</small></div><span>→</span></button>`).join('')||'<div class="notice">Новых разборов пока нет.</div>';
 $$('[data-review]').forEach(b=>b.onclick=()=>openReview(b.dataset.review));
}
function openReview(id){
 const r=REVIEWS.find(x=>String(x.id)===String(id));if(!r)return;
 $('#adminReviewDetail').innerHTML=`<span class="eyebrow">MONTHLY REVIEW</span><h2>Клиент ${r.telegram_id}</h2>
 <div class="detail-section"><h4>Что получилось</h4><p>${r.win||'—'}</p></div>
 <div class="detail-section"><h4>Что было сложно</h4><p>${r.hard||'—'}</p></div>
 <div class="detail-section"><h4>Что хочет изменить</h4><p>${r.next||'—'}</p></div>
 <label>Ответ Никиты<textarea id="trainerFeedback" placeholder="Итог, главная корректировка и фокус следующего месяца"></textarea></label>
 <button class="primary wide" id="sendTrainerFeedback">Отправить разбор</button>`;
 $('#adminReviewModal').classList.add('open');
 $('#sendTrainerFeedback').onclick=async()=>{try{
  await post('/api/admin-review',{id:r.id,feedback:$('#trainerFeedback').value.trim()});
  REVIEWS=REVIEWS.filter(x=>x.id!==r.id);$('#adminReviewModal').classList.remove('open');renderReviews();
 }catch(e){alert(e.message)}};
}
$('#clientSearch').oninput=renderClients;
$$('.modal .close').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));
$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('open')});
load();
