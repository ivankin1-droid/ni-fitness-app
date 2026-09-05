/* NI FITNESS v5.2 PATCH */
const D=window.NI_DATA,$=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const S=JSON.parse(localStorage.getItem('ni_state_v5')||localStorage.getItem('ni_state_v4')||'{}');S.kcal=S.kcal||1500;S.water=Number.isFinite(S.water)?S.water:1.25;S.done=S.done||{};S.portions=S.portions||{};S.replacements=S.replacements||{};S.measurements=S.measurements||[];S.photos=S.photos||[];S.profile=S.profile||{name:'',goal:'Снижение веса',height:'',weight:'',waterGoal:2};S.assignedKcal=S.assignedKcal||S.kcal||1500;S.kcal=S.assignedKcal;S.monthlyReviews=S.monthlyReviews||[];S.subscription=S.subscription||{active:true,tier:'NI FITNESS'};const save=()=>localStorage.setItem('ni_state_v5',JSON.stringify(S));
const today=()=>new Date().toISOString().slice(0,10);const plan=()=>JSON.parse(JSON.stringify(D.plans[String(S.kcal)]||D.plans['1500']));const mkey=i=>`${today()}_${S.kcal}_${i}`;
function effectiveMeal(i){let m=plan()[i],rep=S.replacements[mkey(i)]||{};m.ingredients=m.ingredients.map((x,idx)=>rep[idx]?{...x,name:rep[idx]}:x);let factor=(S.portions[mkey(i)]||100)/100;m.effectiveKcal=Math.round(m.kcal*factor);m.effectiveProtein=Math.round(m.protein*factor*10)/10;m.effectiveGrams=Math.round(m.grams*factor);return m}

function mealHTML(_,i){let m=effectiveMeal(i),done=!!S.done[mkey(i)],portion=S.portions[mkey(i)]||100;return `<div class="meal ${done?'done':''}"><div class="time">${m.time}</div><div><h3>${m.name}</h3><p>${m.effectiveKcal} ккал · ${m.effectiveProtein} г белка · ${m.effectiveGrams} г</p><span class="portion-badge">съедено ${portion}%</span></div><div class="meal-actions"><button class="check" data-meal="${i}">${done?'✓':'○'}</button><button class="mini" data-editmeal="${i}">Количество</button></div></div>`}
function renderMeals(){let p=plan(),html=p.map(mealHTML).join('');$('#homeMeals').innerHTML=html;$('#nutritionMeals').innerHTML=html;let eaten=0,protein=0,count=0;p.forEach((m,i)=>{if(S.done[mkey(i)]){let e=effectiveMeal(i);eaten+=e.effectiveKcal;protein+=e.effectiveProtein;count++}});$('#eatenKcal').textContent=Math.round(eaten);$('#eatenProtein').textContent=Math.round(protein)+' г';$('#mealProgress').textContent=count+'/'+p.length;$$('[data-meal]').forEach(b=>b.onclick=()=>{let k=mkey(+b.dataset.meal);S.done[k]=!S.done[k];save();renderAll()});$$('[data-editmeal]').forEach(b=>b.onclick=()=>openMeal(+b.dataset.editmeal))}
function openMeal(i){let m=effectiveMeal(i),portion=S.portions[mkey(i)]||100;$('#mealDetail').innerHTML=`<span class="eyebrow">${m.time}</span><h2>${m.name}</h2><div class="ingredient-list">${m.ingredients.map((x,idx)=>`<div class="ingredient-row"><div><b>${x.name}</b><small>${x.grams} г по плану</small></div><button class="mini" data-replace="${i}:${idx}">Заменить</button></div>`).join('')}</div><div class="detail-section"><h4>Сколько фактически съедено?</h4><p>100% = вся запланированная порция (${m.grams} г). Можно указать меньше или больше.</p><div class="amount-line"><input id="portionInput" type="number" min="0" max="300" value="${portion}"><span>% порции</span><button class="primary" id="savePortion">Сохранить</button></div></div>`;$('#mealModal').classList.add('open');$('#savePortion').onclick=()=>{S.portions[mkey(i)]=Math.max(0,Math.min(300,+$('#portionInput').value||0));save();$('#mealModal').classList.remove('open');renderAll()};$$('[data-replace]').forEach(b=>b.onclick=()=>{let [mi,ii]=b.dataset.replace.split(':').map(Number);openReplace(mi,ii)})}
function openReplace(mi,ii){let m=effectiveMeal(mi),ing=m.ingredients[ii],opts=D.replacements[ing.name]||['Рис готовый','Гречка готовая','Куриная грудка готовая','Индейка готовая','Треска/хек готовые','Йогурт греческий 2%','Ягоды'];$('#replaceDetail').innerHTML=`<div class="profile-summary">Сейчас: <b>${ing.name}</b> · ${ing.grams} г</div><div class="replace-options">${opts.filter(x=>x!==ing.name).map(x=>`<button data-choice="${x}">${x}</button>`).join('')}</div><div class="detail-section"><p>Замена меняет продукт внутри этого приёма пищи. Количество остаётся ориентировочно тем же; точную эквивалентность по калориям лучше проверять индивидуально.</p></div>`;$('#replaceModal').classList.add('open');$$('[data-choice]').forEach(b=>b.onclick=()=>{let k=mkey(mi);S.replacements[k]=S.replacements[k]||{};S.replacements[k][ii]=b.dataset.choice;save();$('#replaceModal').classList.remove('open');$('#mealModal').classList.remove('open');renderAll()})}
function shopping(){let map={};for(let i=0;i<plan().length;i++){let m=effectiveMeal(i);m.ingredients.forEach(x=>map[x.name]=(map[x.name]||0)+x.grams*7)}$('#shoppingList').innerHTML=Object.entries(map).sort().map(([n,g])=>`<div class="shop-row"><b>${n}</b><span>${g>=1000?(g/1000).toFixed(2).replace(/\.00$/,'')+' кг':Math.round(g)+' г'}</span></div>`).join('')}
function renderWater(){let goal=+S.profile.waterGoal||2;$('#waterValue').textContent=S.water.toFixed(2).replace(/\.00$/,'');$('#waterGoalText').textContent=goal;$('#waterBar').style.width=Math.min(100,S.water/goal*100)+'%'}$('#waterPlus').onclick=()=>{S.water=Math.round((S.water+.25)*100)/100;save();renderWater()};$('#waterMinus').onclick=()=>{S.water=Math.max(0,Math.round((S.water-.25)*100)/100);save();renderWater()};
function go(page){$$('.page').forEach(x=>x.classList.toggle('active',x.dataset.page===page));$$('.bottom-nav [data-goto]').forEach(x=>x.classList.toggle('active',x.dataset.goto===page));scrollTo({top:0,behavior:'smooth'})}$$('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));
let currentGroup='Ноги';const groups=[...new Set(D.exercises.map(x=>x.group))];function renderExercises(){$('#muscleTabs').innerHTML=groups.map(g=>`<button class="${g===currentGroup?'active':''}" data-group="${g}">${g}</button>`).join('');let list=D.exercises.filter(e=>e.group===currentGroup);$('#exerciseList').innerHTML=list.map(e=>`<button class="exercise" data-ex="${e.id}"><div class="exercise-main"><img src="${e.image}" loading="lazy" onerror="this.onerror=null;this.src=''+e.image.split('/').pop()"><div><h3>${String(e.id).padStart(3,'0')} · ${e.name}</h3><p>${e.equipment}</p></div></div><span class="arrow">→</span></button>`).join('');$$('[data-group]').forEach(b=>b.onclick=()=>{currentGroup=b.dataset.group;renderExercises()});$$('[data-ex]').forEach(b=>b.onclick=()=>openExercise(+b.dataset.ex))}
function openExercise(id){let e=D.exercises.find(x=>x.id===id);$('#exerciseDetail').innerHTML=`<span class="eyebrow">${e.group.toUpperCase()} · ${String(e.id).padStart(3,'0')}</span><h2>${e.name}</h2><img class="detail-photo" src="${e.image}" onerror="this.onerror=null;this.src=''+e.image.split('/').pop()"><div class="detail-grid"><div class="detail-box"><small>Оборудование</small><p>${e.equipment}</p></div><div class="detail-box"><small>Суставы</small><p>${e.joints||'—'}</p></div><div class="detail-box"><small>Основные мышцы</small><p>${e.muscles||'—'}</p></div><div class="detail-box"><small>Дополнительно</small><p>${e.assist||'—'}</p></div></div><div class="detail-section"><h4>Техника</h4><p>${e.technique}</p></div><div class="detail-section"><h4>Дыхание</h4><p>${e.breath}</p></div><div class="detail-section"><h4>Частая ошибка</h4><p>${e.mistake}</p></div>`;$('#exerciseModal').classList.add('open')}
$$('.modal .close').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('open'));$$('.modal').forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove('open')});
function renderMaterials(){$('#materialCards').innerHTML=D.materials.map(x=>`<div class="material-card"><h3>${x.title}</h3><p>${x.text}</p></div>`).join('')}
function renderHistory(){$('#measurementHistory').innerHTML=S.measurements.length?S.measurements.slice().reverse().slice(0,8).map(x=>`<div class="history-item"><b>${x.date}</b> · вес ${x.weight||'—'} кг · талия ${x.waist||'—'} · грудь ${x.chest||'—'} · бёдра ${x.hips||'—'} см</div>`).join(''):'<div class="history-item">Пока нет сохранённых замеров.</div>'}$('#saveMeasurements').onclick=()=>{S.measurements.push({date:new Date().toLocaleDateString('ru-RU'),weight:$('#weightInput').value,waist:$('#waistInput').value,chest:$('#chestInput').value,hips:$('#hipsInput').value});save();renderHistory();['#weightInput','#waistInput','#chestInput','#hipsInput'].forEach(x=>$(x).value='')};
function handlePhoto(input){input.onchange=e=>{let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{let img=new Image();img.onload=()=>{let c=document.createElement('canvas'),max=900,scale=Math.min(1,max/img.width);c.width=img.width*scale;c.height=img.height*scale;c.getContext('2d').drawImage(img,0,0,c.width,c.height);S.photos.push({date:new Date().toISOString(),data:c.toDataURL('image/jpeg',.72)});if(S.photos.length>15)S.photos.shift();save();renderPhotos()};img.src=r.result};r.readAsDataURL(f);e.target.value=''}}handlePhoto($('#photoGallery'));handlePhoto($('#photoCamera'));function renderPhotos(){$('#photoGrid').innerHTML=S.photos.slice().reverse().slice(0,12).map(x=>`<img src="${x.data}" title="${x.date}">`).join('')}
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

function renderSubscription(){
 const active=S.subscription?.active!==false;
 const card=document.querySelector('.subscription-card');
 if(card){
   card.querySelector('h2').textContent=active?'NI FITNESS · ACTIVE':'NI FITNESS · PAUSED';
   card.querySelector('.status-pill').textContent=active?'Активна':'Нет доступа';
 }
 // Тестовый режим меняет статус и назначенный план только на этом устройстве. Реальный клиентский доступ подключим через сервер.
}
function initTestPanel(){
  const params=new URLSearchParams(location.search);
  const panel=$('#trainerTestPanel');
  if(!panel || params.get('test')!=='1') return;

  panel.style.display='block';

  const sel=$('#testAssignedKcal');
  const checkbox=$('#testSubActive');
  const btn=$('#applyTestAccess');
  const status=$('#testAccessStatus');

  sel.innerHTML=Object.keys(D.plans)
    .map(k=>`<option value="${k}">${k} ккал</option>`).join('');
  sel.value=String(S.assignedKcal||1500);
  checkbox.checked=S.subscription?.active!==false;

  const showStatus=()=>{
    if(!status) return;
    status.innerHTML=`<div class="status-box"><b>Тестовый клиент</b><small>План: ${S.assignedKcal} ккал · доступ: ${S.subscription?.active!==false?'активен':'отключён'}</small></div>`;
  };
  showStatus();

  btn.onclick=()=>{
    const kcal=Number(sel.value);
    if(!D.plans[String(kcal)]){
      alert('Не удалось выбрать этот план.');
      return;
    }

    S.assignedKcal=kcal;
    S.kcal=kcal;
    S.subscription=S.subscription||{};
    S.subscription.active=checkbox.checked;
    save();

    renderAll();
    showStatus();

    btn.textContent='✓ Доступ назначен';
    setTimeout(()=>btn.textContent='Применить тестовый доступ',1400);
  };
}
initTestPanel();
renderSubscription();

function renderReview(){const el=$('#reviewStatus');if(!el)return;const last=S.monthlyReviews[S.monthlyReviews.length-1];if(!last){el.innerHTML='<span class="muted">Отчёт за этот месяц ещё не отправлен.</span>';return}el.innerHTML=`<div class="status-box"><b>Отчёт отправлен</b><small>${new Date(last.date).toLocaleDateString('ru-RU')} · статус: ${last.status}</small></div>`}
$('#sendReview').onclick=()=>{const now=new Date(),last=S.monthlyReviews[S.monthlyReviews.length-1];if(last&&new Date(last.date).getMonth()===now.getMonth()&&new Date(last.date).getFullYear()===now.getFullYear()){alert('Отчёт за этот месяц уже отправлен. Следующий будет доступен в новом месяце.');return}const measurement=S.measurements[S.measurements.length-1]||null;S.monthlyReviews.push({date:now.toISOString(),win:$('#reviewWin').value.trim(),hard:$('#reviewHard').value.trim(),next:$('#reviewNext').value.trim(),measurement,status:'на проверке'});save();$('#reviewWin').value='';$('#reviewHard').value='';$('#reviewNext').value='';renderReview();alert('Отчёт сохранён. После подключения серверной части он будет автоматически приходить тренеру.')};
renderAll();