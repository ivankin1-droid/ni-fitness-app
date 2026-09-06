/* NI FITNESS v6.1 MANUAL DB */
/* NI FITNESS v5.2 PATCH */
const D=window.NI_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const S=JSON.parse(localStorage.getItem('ni_state_v5')||localStorage.getItem('ni_state_v4')||'{}');S.kcal=S.kcal||1500;S.water=Number.isFinite(S.water)?S.water:1.25;S.done=S.done||{};S.portions=S.portions||{};S.replacements=S.replacements||{};S.measurements=S.measurements||[];S.photos=S.photos||[];S.profile=S.profile||{name:'',goal:'Снижение веса',height:'',weight:'',waterGoal:2};S.assignedKcal=S.assignedKcal||S.kcal||1500;S.kcal=S.assignedKcal;S.monthlyReviews=S.monthlyReviews||[];S.subscription=S.subscription||{active:true,tier:'NI FITNESS'};const save=()=>localStorage.setItem('ni_state_v5',JSON.stringify(S));
const today=()=>new Date().toISOString().slice(0,10);
const DAILY_SWAPS=[
 {'Куриная грудка готовая':'Индейка готовая','Гречка готовая':'Рис готовый','Яблоко':'Ягоды'},
 {'Индейка готовая':'Куриная грудка готовая','Рис готовый':'Гречка готовая','Треска/хек готовые':'Креветки готовые'},
 {'Овсяные хлопья':'Гречневые хлопья','Ягоды':'Банан','Куриная грудка готовая':'Треска/хек готовые'},
 {'Гречка готовая':'Картофель отварной','Треска/хек готовые':'Индейка готовая','Яблоко':'Груша'},
 {'Рис готовый':'Булгур готовый','Куриная грудка готовая':'Индейка готовая','Ягоды':'Киви'},
 {'Овсяные хлопья':'Рисовые хлопья','Творог 5%':'Йогурт греческий 2%','Треска/хек готовые':'Куриная грудка готовая'},
 {'Гречка готовая':'Рис готовый','Куриная грудка готовая':'Индейка готовая','Яблоко':'Апельсин'}
];
function dayIndex(){const d=new Date();return (d.getDay()+6)%7}
const plan=()=>{const p=JSON.parse(JSON.stringify(D.plans[String(S.kcal)]||D.plans['1500']));const swaps=DAILY_SWAPS[dayIndex()]||{};p.forEach(m=>{m.ingredients=m.ingredients.map(x=>swaps[x.name]?{...x,name:swaps[x.name]}:x);const main=m.ingredients.slice(0,2).map(x=>x.name).join(' + ');if(main)m.name=main});return p};
const mkey=i=>`${today()}_${S.kcal}_${i}`;
function effectiveMeal(i){let m=plan()[i],rep=S.replacements[mkey(i)]||{};m.ingredients=m.ingredients.map((x,idx)=>rep[idx]?{...x,name:rep[idx]}:x);let factor=(S.portions[mkey(i)]||100)/100;m.effectiveKcal=Math.round(m.kcal*factor);m.effectiveProtein=Math.round(m.protein*factor*10)/10;m.effectiveGrams=Math.round(m.grams*factor);return m}

function mealHTML(_,i){let m=effectiveMeal(i),done=!!S.done[mkey(i)],portion=S.portions[mkey(i)]||100;return `<div class="meal ${done?'done':''}"><div class="time">${m.time}</div><div><h3>${m.name}</h3><p>${m.effectiveKcal} ккал · ${m.effectiveProtein} г белка · ${m.effectiveGrams} г</p><span class="portion-badge">съедено ${portion}%</span></div><div class="meal-actions"><button class="check" data-meal="${i}">${done?'✓':'○'}</button><button class="mini" data-editmeal="${i}">Количество</button></div></div>`}
function renderMeals(){let p=plan(),html=p.map(mealHTML).join('');$('#homeMeals').innerHTML=html;$('#nutritionMeals').innerHTML=html;let eaten=0,protein=0,count=0;p.forEach((m,i)=>{if(S.done[mkey(i)]){let e=effectiveMeal(i);eaten+=e.effectiveKcal;protein+=e.effectiveProtein;count++}});$('#eatenKcal').textContent=Math.round(eaten);$('#eatenProtein').textContent=Math.round(protein)+' г';$('#mealProgress').textContent=count+'/'+p.length;$$('[data-meal]').forEach(b=>b.onclick=()=>{let k=mkey(+b.dataset.meal);S.done[k]=!S.done[k];save();renderAll()});$$('[data-editmeal]').forEach(b=>b.onclick=()=>openMeal(+b.dataset.editmeal))}
function openMeal(i){let m=effectiveMeal(i),portion=S.portions[mkey(i)]||100;$('#mealDetail').innerHTML=`<span class="eyebrow">${m.time}</span><h2>${m.name}</h2><div class="ingredient-list">${m.ingredients.map((x,idx)=>`<div class="ingredient-row"><div><b>${x.name}</b><small>${x.grams} г по плану</small></div><button class="mini" data-replace="${i}:${idx}">Заменить</button></div>`).join('')}</div><div class="detail-section"><h4>Сколько фактически съедено?</h4><p>100% = вся запланированная порция (${m.grams} г). Можно указать меньше или больше.</p><div class="amount-line"><input id="portionInput" type="number" min="0" max="300" value="${portion}"><span>% порции</span><button class="primary" id="savePortion">Сохранить</button></div></div>`;$('#mealModal').classList.add('open');$('#savePortion').onclick=()=>{S.portions[mkey(i)]=Math.max(0,Math.min(300,+$('#portionInput').value||0));save();$('#mealModal').classList.remove('open');renderAll()};$$('[data-replace]').forEach(b=>b.onclick=()=>{let [mi,ii]=b.dataset.replace.split(':').map(Number);openReplace(mi,ii)})}
function openReplace(mi,ii){let m=effectiveMeal(mi),ing=m.ingredients[ii],opts=D.replacements[ing.name]||['Рис готовый','Гречка готовая','Куриная грудка готовая','Индейка готовая','Треска/хек готовые','Йогурт греческий 2%','Ягоды'];$('#replaceDetail').innerHTML=`<div class="profile-summary">Сейчас: <b>${ing.name}</b> · ${ing.grams} г</div><div class="replace-options">${opts.filter(x=>x!==ing.name).map(x=>`<button data-choice="${x}">${x}</button>`).join('')}</div><div class="detail-section"><p>Замена меняет продукт внутри этого приёма пищи. Количество остаётся ориентировочно тем же; точную эквивалентность по калориям лучше проверять индивидуально.</p></div><button class="request-own" id="requestOwnFood">Не подходит? Запросить замену у Никиты</button>`;$('#replaceModal').classList.add('open');$$('[data-choice]').forEach(b=>b.onclick=()=>{let k=mkey(mi);S.replacements[k]=S.replacements[k]||{};S.replacements[k][ii]=b.dataset.choice;save();$('#replaceModal').classList.remove('open');$('#mealModal').classList.remove('open');renderAll()});const rb=$('#requestOwnFood');if(rb)rb.onclick=()=>openReplacementRequest('food',ing.name)}
function shopping(){let map={};for(let i=0;i<plan().length;i++){let m=effectiveMeal(i);m.ingredients.forEach(x=>map[x.name]=(map[x.name]||0)+x.grams*7)}$('#shoppingList').innerHTML=Object.entries(map).sort().map(([n,g])=>`<div class="shop-row"><b>${n}</b><span>${g>=1000?(g/1000).toFixed(2).replace(/\.00$/,'')+' кг':Math.round(g)+' г'}</span></div>`).join('')}
function renderWater(){let goal=+S.profile.waterGoal||2;$('#waterValue').textContent=S.water.toFixed(2).replace(/\.00$/,'');$('#waterGoalText').textContent=goal;$('#waterBar').style.width=Math.min(100,S.water/goal*100)+'%'}$('#waterPlus').onclick=()=>{S.water=Math.round((S.water+.25)*100)/100;save();renderWater()};$('#waterMinus').onclick=()=>{S.water=Math.max(0,Math.round((S.water-.25)*100)/100);save();renderWater()};
function go(page){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$$('.bottom-nav [data-goto]').forEach(x=>x.classList.toggle('active',x.dataset.goto===page));scrollTo({top:0,behavior:'smooth'})}$$('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));
let currentGroup='Ноги';
const groups=[...new Set(D.exercises.map(x=>x.group))];

function exerciseImageSources(e){
  const file=(e.image||`ex-${String(e.id).padStart(3,'0')}.jpg`).split('/').pop();
  return {
    primary:`assets/exercises/${file}`,
    fallback:`/${file}`
  };
}

function renderExercises(){
  $('#muscleTabs').innerHTML=groups.map(g=>`<button class="${g===currentGroup?'active':''}" data-group="${g}">${g}</button>`).join('');
  const list=D.exercises.filter(e=>e.group===currentGroup);

  $('#exerciseList').innerHTML=list.map(e=>{
    const img=exerciseImageSources(e);
    return `<button class="exercise" data-ex="${e.id}">
      <div class="exercise-main">
        <img src="${img.primary}" data-fallback="${img.fallback}" loading="lazy" alt="${e.name}">
        <div><h3>${String(e.id).padStart(3,'0')} · ${e.name}</h3><p>${e.equipment}</p></div>
      </div>
      <span class="arrow">→</span>
    </button>`;
  }).join('');

  $$('#exerciseList img[data-fallback]').forEach(img=>{
    img.onerror=()=>{
      const fb=img.dataset.fallback;
      if(img.src.endsWith(fb)) return;
      img.onerror=null;
      img.src=fb;
    };
  });

  $$('[data-group]').forEach(b=>b.onclick=()=>{currentGroup=b.dataset.group;renderExercises()});
  $$('[data-ex]').forEach(b=>b.onclick=()=>openExercise(+b.dataset.ex));
}

function openExercise(id){
  const e=D.exercises.find(x=>x.id===id);
  const img=exerciseImageSources(e);

  $('#exerciseDetail').innerHTML=`
    <span class="eyebrow">${e.group.toUpperCase()} · ${String(e.id).padStart(3,'0')}</span>
    <h2>${e.name}</h2>
    <img class="detail-photo" id="exerciseDetailPhoto" src="${img.primary}" data-fallback="${img.fallback}" alt="${e.name}">
    <div class="detail-grid">
      <div class="detail-box"><small>Оборудование</small><p>${e.equipment}</p></div>
      <div class="detail-box"><small>Суставы</small><p>${e.joints||'—'}</p></div>
      <div class="detail-box"><small>Основные мышцы</small><p>${e.muscles||'—'}</p></div>
      <div class="detail-box"><small>Дополнительно</small><p>${e.assist||'—'}</p></div>
    </div>
    <div class="detail-section"><h4>Техника</h4><p>${e.technique}</p></div>
    <div class="detail-section"><h4>Дыхание</h4><p>${e.breath}</p></div>
    <div class="detail-section"><h4>Частая ошибка</h4><p>${e.mistake}</p></div><button class="request-own" id="requestExerciseSwap">Запросить замену упражнения</button>`;

  const photo=$('#exerciseDetailPhoto');
  photo.onerror=()=>{
    const fb=photo.dataset.fallback;
    photo.onerror=null;
    photo.src=fb;
  };

  $('#exerciseModal').classList.add('open');const rq=$('#requestExerciseSwap');if(rq)rq.onclick=()=>openReplacementRequest('exercise',e.name);
}
$$('.modal .close').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('open')});
function renderMaterials(){$('#materialCards').innerHTML=D.materials.map(x=>`<div class="material-card"><h3>${x.title}</h3><p>${x.text}</p></div>`).join('')}
function applyAllowedMaterials(){
  const allowed=S.allowedMaterials;
  if(!Array.isArray(allowed) || S.server?.role==='admin') return;

  $$('.guide-open').forEach(btn=>{
    const g=String(btn.dataset.guide||'');
    const key=g.includes('nutrition')?'nutrition':'products';
    btn.style.display=allowed.includes(key)?'':'none';
  });

  $$('.article-open').forEach(btn=>{
    const key=String(btn.dataset.article||'');
    btn.style.display=allowed.includes(key)?'':'none';
  });
}
function renderHistory(){$('#measurementHistory').innerHTML=S.measurements.length?S.measurements.slice().reverse().slice(0,8).map(x=>`<div class="history-item"><b>${x.date}</b> · вес ${x.weight||'—'} кг · талия ${x.waist||'—'} · грудь ${x.chest||'—'} · бёдра ${x.hips||'—'} см</div>`).join(''):'<div class="history-item">Пока нет сохранённых замеров.</div>'}$('#saveMeasurements').onclick=()=>{S.measurements.push({date:new Date().toLocaleDateString('ru-RU'),weight:$('#weightInput').value,waist:$('#waistInput').value,chest:$('#chestInput').value,hips:$('#hipsInput').value});save();renderHistory();['#weightInput','#waistInput','#chestInput','#hipsInput'].forEach(x=>$(x).value='')};
async function niPhotoApi(payload){
 const r=await fetch('/api/training-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:window.Telegram?.WebApp?.initData||'',...payload})});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Ошибка фото');return j;
}
function handlePhoto(input){input.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{let img=new Image();img.onload=async()=>{try{
 let c=document.createElement('canvas'),max=700,scale=Math.min(1,max/img.width);c.width=Math.round(img.width*scale);c.height=Math.round(img.height*scale);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
 let data=c.toDataURL('image/jpeg',.55); await niPhotoApi({photoAction:'upload',data,photoType:'progress',note:''}); await renderPhotos(); alert('Фото сохранено.');
 }catch(err){alert(err.message)} };img.src=r.result};r.readAsDataURL(f);e.target.value=''}}
handlePhoto($('#photoGallery'));handlePhoto($('#photoCamera'));
async function renderPhotos(){const grid=$('#photoGrid');if(grid)grid.innerHTML=''}
function renderProfile(){let p=S.profile;$('#profileName').value=p.name||'';$('#profileGoal').value=p.goal||'Снижение веса';$('#profileHeight').value=p.height||'';$('#profileWeight').value=p.weight||'';$('#profileWater').value=p.waterGoal||2}$('#saveProfile').onclick=()=>{S.profile={name:$('#profileName').value.trim(),goal:$('#profileGoal').value,height:$('#profileHeight').value,weight:$('#profileWeight').value,waterGoal:+$('#profileWater').value||2};save();renderWater();go('home')};
$('#resetToday').onclick=()=>{let d=today();Object.keys(S.done).filter(k=>k.startsWith(d)).forEach(k=>delete S.done[k]);Object.keys(S.portions).filter(k=>k.startsWith(d)).forEach(k=>delete S.portions[k]);Object.keys(S.replacements).filter(k=>k.startsWith(d)).forEach(k=>delete S.replacements[k]);S.water=0;save();renderAll();go('home')};$('#exportData').onclick=()=>{let blob=new Blob([JSON.stringify(S,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='ni-fitness-data.json';a.click();URL.revokeObjectURL(a.href)};
function renderAll(){
  renderReview();
  renderSubscription();
  const hero=$('#heroKcal'), title=$('#planTitle'), nk=$('#nutritionKcal');
  if(hero) hero.textContent=S.kcal;
  if(title) title.textContent=S.kcal+' ккал';
  if(nk) nk.textContent=S.kcal;
  renderMeals();
  shopping();
  renderWater();
  renderExercises();
  renderMaterials();
  renderHistory();
  renderPhotos();
  renderProfile();
}try{if(window.Telegram?.WebApp){Telegram.WebApp.ready();Telegram.WebApp.expand()}}catch(e){}

const ARTICLES={
 protein:{kicker:'ПИТАНИЕ · ДОБАВКИ',title:'Протеин и добавки',body:`
 <p>Протеин — это удобный источник белка, а не отдельная «магическая» категория питания. Его имеет смысл использовать, когда обычной едой неудобно добрать белок.</p>
 <h4>Что важнее протеина</h4><p>Регулярные приёмы пищи, достаточный белок за день, овощи и фрукты, нормальная калорийность и тренировки.</p>
 <h4>BCAA</h4><p>Если белка в рационе достаточно, отдельные BCAA обычно не дают заметного преимущества для сохранения или роста мышц.</p>
 <h4>Креатин</h4><p>Одна из наиболее изученных спортивных добавок для силовой работы и набора безжировой массы. Добавки не заменяют программу тренировок и питание.</p>`},
 goals:{kicker:'ПИТАНИЕ · ЦЕЛЬ',title:'Снижение, поддержание, набор',body:`
 <p><b>Снижение веса:</b> умеренный дефицит, белок в основных приёмах пищи, больше объёма за счёт овощей и контроль высококалорийных добавок.</p>
 <p><b>Поддержание:</b> стабильная калорийность, разнообразие и корректировка порций по активности, голоду и динамике веса.</p>
 <p><b>Набор мышц:</b> небольшой профицит, достаточный белок, углеводы вокруг тренировок и контроль темпа набора.</p>
 <p>Во всех трёх целях регулярность, сон и силовые тренировки важнее отдельных «идеальных» продуктов.</p>`},
 labels:{kicker:'ПРОДУКТЫ · ЭТИКЕТКА',title:'Как читать этикетку',body:`
 <p>Сначала смотри размер порции и калорийность на 100 г. Потом — белок, жиры и углеводы. Состав помогает понять, из чего продукт сделан, но сам по себе длинный состав не делает продукт «плохим».</p>
 <h4>Для белковой базы</h4><p>Сравнивай количество белка на 100 г и общую калорийность. Для соусов, масел, орехов и сыров особенно важно учитывать размер порции.</p>
 <h4>Практическое правило</h4><p>Выбирай продукт не по одному слову на упаковке, а по тому, как он вписывается в твой конкретный рацион.</p>`}
};
$$('.article-open').forEach(b=>b.onclick=()=>{
 const a=ARTICLES[b.dataset.article]; if(!a)return;
 $('#articleDetail').innerHTML=`<span class="eyebrow">${a.kicker}</span><h2>${a.title}</h2><div class="article-body">${a.body}</div>`;
 $('#articleModal').classList.add('open');
});


// v5.2: ONE guide handler only. PDFs are always loaded from the root of this Vercel app.
const GUIDE_FILES={
  './nutrition-guide.pdf':'/nutrition-guide.pdf',
  './product-guide.pdf':'/product-guide.pdf'
};
$$('.guide-open').forEach(b=>{
  b.onclick=()=>{
    const path=GUIDE_FILES[b.dataset.guide] || b.dataset.guide;
    const url=new URL(path, location.origin).href;
    // Hard stop against accidental editor/source links.
    if(!url.startsWith(location.origin)){
      alert('Не удалось открыть материал.');
      return;
    }
    try{
      if(window.Telegram?.WebApp?.openLink){
        Telegram.WebApp.openLink(url);
      }else{
        window.open(url,'_blank','noopener,noreferrer');
      }
    }catch(e){
      window.location.assign(url);
    }
  };
});



renderSubscription();

function renderReview(){const el=$('#reviewStatus');if(!el)return;const last=S.monthlyReviews[S.monthlyReviews.length-1];if(!last){el.innerHTML='<span class="muted">Отчёт за этот месяц ещё не отправлен.</span>';return}el.innerHTML=`<div class="status-box"><b>Отчёт отправлен</b><small>${new Date(last.date).toLocaleDateString('ru-RU')} · статус: ${last.status}</small></div>`}
renderAll();


/* ===== NI FITNESS v6 · SERVER ACCESS ===== */
S.server = S.server || {ready:false, role:'client', telegramId:null, remote:false};
let SERVER_PROFILE = null;

function telegramInitData(){
  try{return window.Telegram?.WebApp?.initData || ''}catch(e){return ''}
}
async function apiPost(path, body={}){
  const r=await fetch(path,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({initData:telegramInitData(),...body})
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j.error||'Ошибка сервера');
  return j;
}
function setServerStatus(text, ok=false){
  const el=$('#serverStatusText'), pill=$('#serverStatusPill');
  if(el) el.textContent=text;
  if(pill){pill.textContent=ok?'ONLINE':'CHECK';pill.classList.toggle('ok',ok)}
}

const TARIFFS={
  '690':{name:'START',level:1},
  '1490':{name:'PRO',level:2},
  '2990':{name:'PREMIUM',level:3}
};
function currentTariff(){
  if(S.demo?.active)return {code:'DEMO',name:'DEMO',level:2};
  const code=String(S.subscription?.tier||SERVER_PROFILE?.tariff_code||'');
  return {code,...(TARIFFS[code]||{name:'NO PLAN',level:0})};
}
function featureRequiredLevel(feature){
  return {
    training:2,
    'monthly-review':2,
    premium:3
  }[feature]||1;
}
function openUpgrade(feature){
  const need=featureRequiredLevel(feature);
  const title=$('#upgradeTitle'), text=$('#upgradeText'), modal=$('#upgradeModal');
  if(!modal){location.href='/payment.html';return}
  if(title) title.textContent=need===3?'Доступно в PREMIUM':'Доступно в PRO';
  if(text) text.textContent=need===3
    ?'Персональные корректировки питания и тренировок, личный разбор и приоритетная обратная связь входят в PREMIUM.'
    :'Тренировочный раздел, все материалы, фото прогресса и ежемесячный отчёт входят в PRO и PREMIUM.';
  modal.classList.add('open');
}
function applyTariffAccess(){
  if(S.server?.role==='admin') return;
  const tariff=currentTariff();

  // Training page/nav/quick access remain visible but open an upgrade prompt on START.
  $$('[data-goto="exercises"]').forEach(btn=>{
    if(tariff.level<2){
      btn.onclick=(e)=>{e.preventDefault();openUpgrade('training')};
      btn.classList.add('tier-locked');
    }else{
      btn.onclick=()=>go('exercises');
      btn.classList.remove('tier-locked');
    }
  });

  const review=$('[data-feature="monthly-review"]');
  if(review){
    review.classList.toggle('feature-locked',tariff.level<2);
    if(tariff.level<2){
      review.innerHTML=`<span class="eyebrow">PRO FEATURE</span><h2>Ежемесячный разбор прогресса</h2><p>Отправка отчёта тренеру и обратная связь доступны в PRO и PREMIUM.</p><button class="primary wide" id="reviewUpgradeBtn">Перейти на PRO</button>`;
      const b=$('#reviewUpgradeBtn'); if(b)b.onclick=()=>openUpgrade('monthly-review');
    }
  }

  // START gets only the two foundational guides.
  if(tariff.level===1){
    $$('.article-open').forEach(btn=>btn.style.display='none');
  }

  // Profile subscription card shows the actual paid plan.
  const card=$('.subscription-card');
  if(card && tariff.level){
    const h=card.querySelector('h2');
    if(h)h.textContent=`NI FITNESS · ${tariff.name}`;
  }
}
function bindTariffPaymentButtons(){
  $$('[data-buy-tariff]').forEach(btn=>{
    btn.onclick=()=>{
      const tariff=btn.dataset.buyTariff;
      location.href=`/payment.html?tariff=${encodeURIComponent(tariff)}`;
    };
  });
  const up=$('#upgradePayBtn');
  if(up)up.onclick=()=>location.href='/payment.html';
}

function showAccessLock(profile, reason){
  const lock=$('#accessLock');
  if(!lock)return;
  const id=profile?.telegram_id || S.server.telegramId || '—';
  $('#lockTelegramId').textContent=id;
  $('#accessLockTitle').textContent='Выберите свой план';
  $('#accessLockText').textContent='Сравните START, PRO и PREMIUM и выберите подходящий уровень доступа.';
  bindTariffPaymentButtons();
  lock.style.display='flex';
}
function hideAccessLock(){
  const lock=$('#accessLock'); if(lock) lock.style.display='none';
}
function subscriptionIsActive(profile){
  if(!profile?.subscription_active) return false;
  if(!profile.subscription_until) return true;
  return new Date(profile.subscription_until).getTime() > Date.now();
}
function applyServerProfile(profile){
  SERVER_PROFILE=profile;
  S.server={ready:true,role:profile.role||'client',telegramId:profile.telegram_id,remote:true};
  S.assignedKcal=Number(profile.assigned_kcal||1500);
  S.kcal=S.assignedKcal;
  S.subscription=S.subscription||{};
  S.subscription.active=subscriptionIsActive(profile);
  S.subscription.until=profile.subscription_until||null;
  S.subscription.tier=String(profile.tariff_code||'');
  S.demo={active:!!profile.demo_effective,expiresAt:profile.demo_expires_at||null,used:!!profile.demo_used};
  S.allowedMaterials=Array.isArray(profile.allowed_materials)
    ? profile.allowed_materials
    : (()=>{try{const a=JSON.parse(profile.allowed_materials||'null');return Array.isArray(a)?a:null}catch(e){return null}})();
  S.profile=S.profile||{};
  if(profile.first_name && !S.profile.name) S.profile.name=profile.first_name;
  save();

  const idEl=$('#serverTelegramId');
  if(idEl) idEl.textContent=String(profile.telegram_id);
  setServerStatus('Доступ проверен по Telegram. Данные назначения загружены с сервера.',true);

  const adminBtn=$('#openAdminBtn');
  if(adminBtn && profile.role==='admin'){
    adminBtn.style.display='block';
    adminBtn.onclick=()=>location.href='/admin.html';
  }

  if(S.subscription.active || S.demo?.active || profile.role==='admin') hideAccessLock();
  else showAccessLock(profile,'Подписка сейчас не активна. После активации тренером приложение откроется автоматически.');

  renderAll();
  applyAllowedMaterials();
  applyTariffAccess();
}
async function loadServerSession(){
  const initData=telegramInitData();

  // Для обычного браузера не притворяемся авторизованным клиентом.
  if(!initData){
    S.server={ready:true,role:'browser',telegramId:null,remote:false};
    setServerStatus('Откройте приложение внутри Telegram, чтобы проверить реальный доступ.',false);
    const idEl=$('#serverTelegramId'); if(idEl) idEl.textContent='только в Telegram';
    // В браузере владельцу оставляем интерфейс видимым для проверки дизайна.
    hideAccessLock();
    return;
  }

  try{
    const result=await apiPost('/api/session',{});
    applyServerProfile(result.profile);
  }catch(e){
    const tgId=window.Telegram?.WebApp?.initDataUnsafe?.user?.id;
    if(tgId){
      S.server.telegramId=String(tgId);
      const idEl=$('#serverTelegramId'); if(idEl) idEl.textContent=String(tgId);
    }
    const message=e.message||'Не удалось проверить доступ';
    setServerStatus(message,false);
    showAccessLock({telegram_id:tgId||null},message);
  }
}

function renderSubscription(){
 const active=S.subscription?.active!==false;
 const card=document.querySelector('.subscription-card');
 if(card){
   const h=card.querySelector('h2'), p=card.querySelector('.status-pill'), small=card.querySelector('small');
   if(h) h.textContent=active?'NI FITNESS · ACTIVE':'NI FITNESS · PAUSED';
   if(p) p.textContent=active?'Активна':'Нет доступа';
   if(small){
     if(S.subscription?.until){
       small.textContent='Доступ до '+new Date(S.subscription.until).toLocaleDateString('ru-RU');
     }else small.textContent=active?'Персональный план и материалы':'Доступ приостановлен';
   }
 }
}

function renderReview(){
 const el=$('#reviewStatus'); if(!el)return;
 const last=S.monthlyReviews[S.monthlyReviews.length-1];
 if(!last){el.innerHTML='<span class="muted">Отчёт за этот месяц ещё не отправлен.</span>';return}
 let feedback=last.trainer_reply?`<div class="trainer-feedback"><b>Ответ Никиты</b><p>${last.trainer_reply}</p></div>`:'';
 el.innerHTML=`<div class="status-box"><b>Отчёт отправлен</b><small>${new Date(last.date).toLocaleDateString('ru-RU')} · статус: ${last.status}</small></div>${feedback}`;
}

const sendReviewBtn=$('#sendReview');
if(sendReviewBtn) sendReviewBtn.onclick=async()=>{
  const win=$('#reviewWin').value.trim(), hard=$('#reviewHard').value.trim(), next=$('#reviewNext').value.trim();
  if(!win && !hard && !next){alert('Добавьте хотя бы один итог месяца.');return}
  sendReviewBtn.disabled=true; sendReviewBtn.textContent='Отправляем…';
  try{
    if(S.server?.remote){
      const latestMeasurement=S.measurements[S.measurements.length-1]||null;
      const result=await apiPost('/api/monthly-review',{action:'submit',win,hard,next,measurement:latestMeasurement});
      const r=result.review;
      const local={date:r.created_at,win:r.win,hard:r.hard,next:r.next,status:r.status,trainer_feedback:r.trainer_feedback||''};
      const idx=S.monthlyReviews.findIndex(x=>x.id===r.id);
      if(idx>=0)S.monthlyReviews[idx]=local; else S.monthlyReviews.push({...local,id:r.id});
    }else{
      S.monthlyReviews.push({date:new Date().toISOString(),win,hard,next,status:'локально — сервер не подключён'});
    }
    save();
    $('#reviewWin').value='';$('#reviewHard').value='';$('#reviewNext').value='';
    renderReview();
    alert(S.server?.remote?'Отчёт отправлен Никите.':'Отчёт сохранён только на этом устройстве.');
  }catch(e){
    alert(e.message||'Не удалось отправить отчёт');
  }finally{
    sendReviewBtn.disabled=false;sendReviewBtn.textContent='Отправить отчёт тренеру';
  }
};

async function loadRemoteReviews(){
 if(!S.server?.remote)return;
 try{
   const result=await apiPost('/api/monthly-review',{action:'mine'});
   if(Array.isArray(result.reviews)){
     S.monthlyReviews=result.reviews.map(r=>({
       id:r.id,date:r.created_at,win:r.win,hard:r.hard,next:r.next,status:r.status,
       trainer_feedback:r.trainer_feedback||''
     }));
     save();renderReview();
   }
 }catch(e){}
}

loadServerSession().then(loadRemoteReviews);



/* ===== NI FITNESS v7 · TARIFF UI ===== */
bindTariffPaymentButtons();
const upgradeModal=$('#upgradeModal');
if(upgradeModal){
  const close=upgradeModal.querySelector('.close');
  if(close)close.onclick=()=>upgradeModal.classList.remove('open');
  upgradeModal.onclick=e=>{if(e.target===upgradeModal)upgradeModal.classList.remove('open')};
}


/* ===== NI FITNESS · PERSONAL PLAN ADJUSTMENTS ===== */
async function loadPersonalAdjustments(){
  try{
    const r=await fetch('/api/plan-adjustments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:window.Telegram?.WebApp?.initData||''})});
    if(!r.ok)return;
    const j=await r.json(); const a=(j.adjustments||[])[0]; if(!a)return;
    const key='ni_seen_adjustment_'+a.id;
    let host=document.querySelector('#personalAdjustmentBanner');
    if(!host){
      host=document.createElement('div'); host.id='personalAdjustmentBanner';
      host.style.cssText='margin:12px 16px;padding:16px;border:1px solid #3a3a40;border-radius:18px;background:#17171a;color:#f4f2ed;line-height:1.45';
      const main=document.querySelector('main')||document.body; main.prepend(host);
    }
    host.innerHTML=`<div style="font-size:9px;letter-spacing:.18em;color:#999;font-weight:800">ПЛАН ОБНОВЛЁН НИКИТОЙ</div>
      <div style="font-size:20px;font-weight:800;margin:6px 0">${a.new_kcal} ккал</div>
      <div style="font-size:12px;color:#aaa">${a.trainer_comment||''}</div>
      <div style="font-size:10px;color:#666;margin-top:8px">Действует с ${a.effective_from?new Date(a.effective_from+'T00:00:00').toLocaleDateString('ru-RU'):''}</div>`;
  }catch(e){}
}
setTimeout(loadPersonalAdjustments,1200);


/* ===== NI FITNESS · PERSONAL TRAINING PLAN ===== */
async function loadPersonalTrainingPlan(){
 try{
  const r=await fetch('/api/training-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:window.Telegram?.WebApp?.initData||''})});
  if(!r.ok)return;
  const j=await r.json(), p=j.plan;if(!p)return;
  const page=document.querySelector('[data-page="exercises"]'); if(!page)return;
  let box=document.querySelector('#personalTrainingPlan');
  if(!box){box=document.createElement('div');box.id='personalTrainingPlan';const title=page.querySelector('.page-title');title.insertAdjacentElement('afterend',box)}
  box.className='card';
  box.innerHTML=`<span class="eyebrow">МОЙ ПЛАН</span><h2>${p.plan_name||'Персональный план'}</h2>
  ${p.trainer_comment?`<p class="muted">${p.trainer_comment}</p>`:''}
  ${(p.days||[]).map((d,i)=>`<div class="detail-section"><h4>${d.title||`День ${i+1}`}</h4>${(d.exercises||[]).map(x=>`<div style="padding:9px 0;border-bottom:1px solid #29292e"><b>${x.name}</b><br><small class="muted">${x.sets} подх. · ${x.reps} повт. · отдых ${x.rest}</small></div>`).join('')}</div>`).join('')}`;
 }catch(e){}
}
setTimeout(loadPersonalTrainingPlan,1400);


/* ===== NI FITNESS · RICH TRAINING CARDS V2 ===== */
function niEsc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
function openNIExercise(x){
 let m=document.querySelector('#niExerciseModal');
 if(!m){m=document.createElement('div');m.id='niExerciseModal';m.style.cssText='position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.78);padding:20px;overflow:auto';document.body.appendChild(m)}
 m.innerHTML=`<div style="max-width:560px;margin:30px auto;background:#17171a;border:1px solid #333;border-radius:22px;padding:18px;color:#f5f3ee">
 <button onclick="this.closest('#niExerciseModal').style.display='none'" style="float:right">✕</button>
 <div style="font-size:9px;letter-spacing:.16em;color:#999">${niEsc(x.group||'УПРАЖНЕНИЕ')}</div><h2>${niEsc(x.name)}</h2>
 ${x.image?`<img src="${niEsc(x.image)}" alt="" style="width:100%;border-radius:16px;margin:8px 0" onerror="this.style.display='none'">`:''}
 <p><b>Рабочие мышцы:</b> ${niEsc(x.muscles||'—')}</p><p><b>Оборудование:</b> ${niEsc(x.equipment||'—')}</p>
 <p><b>Техника:</b> ${niEsc(x.technique||'Описание добавляется тренером.')}</p>
 ${x.breath?`<p><b>Дыхание:</b> ${niEsc(x.breath)}</p>`:''}${x.mistake?`<p><b>Частая ошибка:</b> ${niEsc(x.mistake)}</p>`:''}
 ${x.note?`<p><b>Комментарий Никиты:</b> ${niEsc(x.note)}</p>`:''}</div>`;m.style.display='block';
}
loadPersonalTrainingPlan=async function(){
 try{
  const r=await fetch('/api/training-plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({initData:window.Telegram?.WebApp?.initData||''})});
  if(!r.ok)return;const j=await r.json(),p=j.plan;if(!p)return;
  const page=document.querySelector('[data-page="exercises"]');if(!page)return;
  let box=document.querySelector('#personalTrainingPlan');if(!box){box=document.createElement('div');box.id='personalTrainingPlan';(page.querySelector('.page-title')||page).insertAdjacentElement('afterend',box)}
  box.className='card';box.innerHTML=`<span class="eyebrow">МОЙ ПЛАН</span><h2>${niEsc(p.plan_name||'Персональный план')}</h2>${p.trainer_comment?`<p class="muted">${niEsc(p.trainer_comment)}</p>`:''}
  ${(p.days||[]).map((d,i)=>`<div class="detail-section"><h4>${niEsc(d.title||`День ${i+1}`)}</h4>${(d.exercises||[]).map((x,k)=>`<button type="button" class="ni-client-ex" data-di="${i}" data-ei="${k}" style="display:block;width:100%;text-align:left;padding:12px;margin:7px 0;border:1px solid #303036;border-radius:14px;background:#18181b;color:#f4f2ed"><b>${niEsc(x.name)}</b><br><small style="color:#999">${niEsc(x.sets)} подх. · ${niEsc(x.reps)} повт. · отдых ${niEsc(x.rest)}</small></button>`).join('')}</div>`).join('')}`;
  box.querySelectorAll('.ni-client-ex').forEach(b=>b.onclick=()=>openNIExercise(p.days[+b.dataset.di].exercises[+b.dataset.ei]));
 }catch(e){}
};
setTimeout(loadPersonalTrainingPlan,1600);


/* ===== NI FITNESS v2 · TODAY / DEMO / REQUESTS / WEEKLY ===== */
let REPLACE_CONTEXT={type:'food',current:''};
function openReplacementRequest(type,current){
 REPLACE_CONTEXT={type,current};const m=$('#requestReplaceModal');if(!m)return;
 $('#requestReplaceCurrent').textContent=(type==='exercise'?'Упражнение: ':'Продукт: ')+current;
 $('#requestReplaceMessage').value='';$('#replacementRequestStatus').textContent='';m.classList.add('open');
}
const sendRep=$('#sendReplacementRequest');if(sendRep)sendRep.onclick=async()=>{
 const msg=$('#requestReplaceMessage').value.trim();if(!msg)return alert('Напишите пожелание по замене.');
 try{await apiPost('/api/monthly-review',{action:'replacement-create',requestType:REPLACE_CONTEXT.type,currentItem:REPLACE_CONTEXT.current,message:msg});$('#replacementRequestStatus').innerHTML='<div class="status-box"><b>Запрос отправлен Никите</b><small>Ответ появится в приложении.</small></div>';}
 catch(e){$('#replacementRequestStatus').textContent=e.message}
};
async function loadReplacementRequests(){
 try{const j=await apiPost('/api/monthly-review',{action:'replacement-list'});const done=(j.requests||[]).filter(x=>x.trainer_reply);if(done.length){const latest=done[0];const box=$('#todayDashboard');if(box&&!$('#latestTrainerReply'))box.insertAdjacentHTML('afterend',`<div class="card" id="latestTrainerReply"><span class="eyebrow">ОТВЕТ ТРЕНЕРА</span><h2>${latest.request_type==='food'?'Замена продукта':'Замена упражнения'}</h2><p class="muted">${niEsc(latest.current_item||'')}</p><p>${niEsc(latest.trainer_reply)}</p></div>`)}}
 catch(e){}
}
function renderTodayDashboard(){
 const label=$('#todayLabel');if(label)label.textContent=new Intl.DateTimeFormat('ru-RU',{weekday:'long',day:'numeric',month:'long'}).format(new Date());
 const p=plan();let done=p.filter((_,i)=>S.done[mkey(i)]).length;
 if($('#todayMealStat'))$('#todayMealStat').textContent=`${done}/${p.length}`;
 if($('#todayWaterStat'))$('#todayWaterStat').textContent=`${Number(S.water||0).toFixed(2).replace(/\.00$/,'')} л`;
 if($('#todayTrainingStat'))$('#todayTrainingStat').textContent=currentTariff().level>=2?'Открыть':'PRO';
}
async function loadWeeklyCheckins(){
 const el=$('#weeklyStatus');if(!el)return;try{const j=await apiPost('/api/monthly-review',{action:'weekly-list'});const last=(j.checkins||[])[0];
 if(!last){el.innerHTML='<span class="muted">На этой неделе отчёт ещё не отправлен.</span>';return}
 el.innerHTML=`<div class="status-box"><b>Последний чек-ин: ${new Date(last.created_at).toLocaleDateString('ru-RU')}</b><small>${niEsc(last.status||'new')}</small>${last.trainer_reply?`<div class="trainer-feedback"><b>Ответ Никиты</b><p>${niEsc(last.trainer_reply)}</p></div>`:''}</div>`;
 }catch(e){el.textContent=''}
}
const weeklyBtn=$('#sendWeeklyCheckin');if(weeklyBtn)weeklyBtn.onclick=async()=>{
 try{await apiPost('/api/monthly-review',{action:'weekly-submit',weight:$('#weeklyWeight').value,nutritionScore:$('#weeklyNutrition').value,trainingCount:$('#weeklyTraining').value,sleepScore:$('#weeklySleep').value,wellbeingScore:$('#weeklyWellbeing').value,win:$('#weeklyWin').value,hard:$('#weeklyHard').value,question:$('#weeklyQuestion').value});await loadWeeklyCheckins();alert('Недельный чек-ин отправлен Никите.');}
 catch(e){alert(e.message)}
};
function updateDemoBanner(){
 const b=$('#demoBanner');if(!b)return;if(!S.demo?.active||!S.demo.expiresAt){b.style.display='none';return}b.style.display='flex';
 const left=Math.max(0,new Date(S.demo.expiresAt).getTime()-Date.now());if(left<=0){S.demo.active=false;save();location.reload();return}
 const min=Math.floor(left/60000),sec=Math.floor((left%60000)/1000);$('#demoTimer').textContent=`${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
setInterval(updateDemoBanner,1000);
const demoBtn=$('#startDemoBtn');if(demoBtn)demoBtn.onclick=async()=>{
 demoBtn.disabled=true;const st=$('#demoLockStatus');if(st)st.textContent='Запускаем демо…';
 try{const j=await apiPost('/api/session',{action:'start-demo'});applyServerProfile(j.profile);updateDemoBanner();}
 catch(e){if(st)st.textContent=e.message;demoBtn.disabled=false}
};
const _renderAllV2=renderAll;renderAll=function(){_renderAllV2();renderTodayDashboard();updateDemoBanner()};
setTimeout(()=>{renderTodayDashboard();loadWeeklyCheckins();loadReplacementRequests();updateDemoBanner()},1800);
