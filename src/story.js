const storyTypes={
  memory:["📸","Recuerdos","memories"], adventure:["🧭","Aventuras","aventuras"],
  plan:["🗓️","Planes realizados","calendar"], date:["💞","Fechas especiales","dates"],
  dream:["✨","Sueños cumplidos","dreams"], challenge:["🏆","Retos completados","challenges"],
  letter:["💌","Cartas abiertas","letters"],
};
let storyFilters={month:"",kind:"all",query:"",favorites:false,view:"timeline",order:"newest"};
function storyDate(value){
  if(!value)return "";
  if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return "";
  return new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Bogota",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
}
function collectStoryEntries(cache=advCache,planRows=plans,today=countdownToday(),now=Date.now()){
  const entries=[], memoryIds=new Set(), linkedPlans=new Set(), linkedAdventures=new Set();
  const add=(kind,row,date,extra={})=>{
    if(!date||date>today)return;
    entries.push({kind,id:row.id,date,title:row.title,description:row.description||"",...extra});
  };
  for(const m of cache.memories||[]){
    const date=storyDate(m.memory_date);
    if(!date||date>today)continue;
    const adventures=(cache.adventures||[]).filter(a=>a.memory_id===m.id&&a.status==="done");
    adventures.forEach(a=>linkedAdventures.add(a.id));
    memoryIds.add(m.id);
    if(m.source_plan_id)linkedPlans.add(m.source_plan_id+"|"+(m.source_occurrence_date||date));
    for(const a of adventures)if(a.plan_id)linkedPlans.add(a.plan_id+"|"+date);
    const place=(cache.places||[]).find(p=>p.id===m.place_id);
    add("memory",m,date,{photo:m.photo_url||"",photo_x:m.photo_x,photo_y:m.photo_y,photo_zoom:m.photo_zoom,favorite:!!m.favorite,place:place?.name||m.location||"",badge:adventures.length?"Aventura vivida":""});
  }
  for(const a of cache.adventures||[]){
    if(a.status!=="done"||a.kind==="coupon"||linkedAdventures.has(a.id)||memoryIds.has(a.memory_id))continue;
    const date=storyDate(a.target_date)||storyDate(a.completed_at);
    const actual=date&&date<=today?date:storyDate(a.completed_at);
    if(actual&&actual<=today&&a.plan_id)linkedPlans.add(a.plan_id+"|"+actual);
    // Surprise details stay in the existing authorized adventure view.
    add("adventure",a,actual,{description:a.kind==="surprise"?"Una sorpresa que vivieron juntos.":a.details||""});
  }
  for(const p of planRows||[]){
    const dates=p.recurrence_enabled?p.completed_occurrences||[]:p.completed?[p.plan_date]:[];
    for(const date of new Set(dates)){
      if((p.cancelled_occurrences||[]).includes(date)||(p.skipped_occurrences||[]).includes(date)||linkedPlans.has(p.id+"|"+date))continue;
      add("plan",p,date,{description:"Plan marcado como realizado.",icon:categoryIcon(p.category)});
    }
  }
  for(const d of cache.dates||[])add("date",d,storyDate(d.event_date));
  for(const d of cache.dreams||[])if(d.status==="cumplido")add("dream",d,storyDate(d.completed_at)||storyDate(d.target_date));
  for(const c of cache.challenges||[])if(c.completed)add("challenge",c,storyDate(c.completed_at)||storyDate(c.end_date));
  for(const l of cache.letters||[]){
    // Neither future locked content nor body text appears on the timeline.
    if(l.content==null||(l.unlock_at&&new Date(l.unlock_at).getTime()>now))continue;
    add("letter",l,storyDate(l.unlock_at||l.created_at),{description:"Una carta que forma parte de nuestra historia."});
  }
  return entries.sort((a,b)=>b.date.localeCompare(a.date)||String(a.title||"").localeCompare(String(b.title||"")));
}
function storyMonthTitle(month){
  return new Intl.DateTimeFormat("es-CO",{month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(month+"-01T12:00:00Z"));
}
function storySearch(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();}
function filterStoryEntries(entries,filters=storyFilters){
  const q=storySearch(filters.query);
  const filtered=entries.filter(e=>(!filters.month||e.date.startsWith(filters.month))&&(filters.kind==="all"||e.kind===filters.kind||(filters.kind==="adventure"&&e.badge))&&(!filters.favorites||e.favorite)&&(filters.view!=="gallery"||e.photo)&&(!q||storySearch(e.title+" "+e.description+" "+(e.place||"")).includes(q)));
  return filters.order==="oldest"?filtered.slice().reverse():filtered;
}
function storyOpen(btn){
  const {kind,id,date}=btn.dataset;
  const type=storyTypes[kind];
  if(type)navigateToItem(type[2],id,date);
}
function storyCard(e,compact=false){
  const [icon,label]=storyTypes[e.kind], displayIcon=e.icon||icon;
  return `<button type="button" class="storyEntry ${compact?"storyEntryCompact":""}" data-kind="${esc(e.kind)}" data-id="${esc(e.id)}" data-date="${esc(e.date)}" onclick="storyOpen(this)">
    <div class="storyThumbWrap">${e.photo?`<img class="storyThumb" data-memory-path="${esc(e.photo)}" alt="Foto de ${esc(e.title)}" loading="lazy" style="${photoFrameStyle(e)}">`:`<span class="storyThumb storyNoPhoto">${esc(displayIcon)}</span>`}</div>
    <div class="storyEntryContent"><small>${esc(label)} · ${esc(dateES(e.date))}</small><strong>${e.favorite?"❤️ ":""}${esc(e.title)}</strong>${e.badge?`<span class="adventureBadge">${esc(e.badge)}</span>`:""}${e.place?`<small>📍 ${esc(e.place)}</small>`:""}${e.description&&!compact?`<p>${esc(e.description)}</p>`:""}<span class="storyOpenHint">Abrir ${e.kind==="memory"?"recuerdo":"momento"} ↗</span></div></button>`;
}
function storyThrowbacks(entries,today){
  const memories=entries.filter(e=>e.kind==="memory"&&e.date<today);
  const sameDay=memories.filter(e=>e.date.slice(5)===today.slice(5));
  if(sameDay.length)return {label:"Un día como hoy",entries:sameDay.slice(0,3)};
  const sameNumber=memories.filter(e=>e.date.slice(8)===today.slice(8));
  if(sameNumber.length)return {label:"Un día como este, en otro mes",entries:sameNumber.slice(0,3)};
  const pool=memories.filter(e=>e.favorite);
  const choices=pool.length?pool:memories;
  return {label:"Un recuerdo para volver a sonreír",entries:choices.length?[choices[Math.floor(Date.parse(today+"T00:00:00Z")/86400000)%choices.length]]:[]};
}
function storyDaysSince(date,today){return Math.max(0,Math.floor((Date.parse(today)-Date.parse(date))/86400000));}
function applyStoryFilters(){
  storyFilters.month=$("storyMonth").value;
  storyFilters.kind=$("storyKind").value;
  storyFilters.query=$("storySearch").value.trim();
  storyFilters.favorites=$("storyFavorites").checked;
  storyFilters.order=$("storyOrder").value;
  renderAdvanced();
}
function setStoryView(view){
  if(!["timeline","gallery"].includes(view))return;
  storyFilters.view=view;renderAdvanced();
}
function clearStoryFilters(){
  storyFilters={month:"",kind:"all",query:"",favorites:false,view:"timeline",order:"newest"};renderAdvanced();
}
function renderAdvStory(){
  const today=countdownToday(), entries=collectStoryEntries(advCache,plans,today), filtered=filterStoryEntries(entries);
  const months=[...new Set(entries.map(e=>e.date.slice(0,7)))].sort().reverse();
  const memories=entries.filter(e=>e.kind==="memory"), throwbacks=storyThrowbacks(entries,today);
  const chapter=storyFilters.month||today.slice(0,7), monthly=entries.filter(e=>e.date.startsWith(chapter));
  const groups=[...new Set(filtered.map(e=>e.date.slice(0,7)))];
  const view=storyFilters.view;
  return `<section class="bond storyModule" id="storyToday" data-date="${esc(today)}">
    <div class="bondHero"><div class="bondHeroHeart">📖</div><small>CAPÍTULO A CAPÍTULO</small><h2>Nuestra historia</h2><p>Todo lo que hemos vivido, lo que Dios nos ha permitido construir y los recuerdos que llevamos en el corazón.</p><div class="storyHeroActions"><button class="btn primary" onclick="openMemoryForm()">📸 Añadir recuerdo</button><button class="btn" onclick="openAlbumExport()">📚 Álbum o collage</button></div></div>
    <div class="storyMilestones"><div><span>💞</span><strong>Nos conocimos</strong><small>21 de enero de 2026</small><b>${storyDaysSince("2026-01-21",today)} días</b></div><div><span>💍</span><strong>Nos hicimos novios</strong><small>21 de abril de 2026</small><b>${storyDaysSince("2026-04-21",today)} días</b></div></div>
    <div class="adventureStats"><div><strong>${memories.length}</strong><span>recuerdos</span></div><div><strong>${memories.filter(e=>e.photo).length}</strong><span>fotos guardadas</span></div><div><strong>${entries.length}</strong><span>momentos en historia</span></div></div>
    ${throwbacks.entries.length?`<div class="advCard"><h3>💌 ${throwbacks.label}</h3><div class="storyThrowbacks">${throwbacks.entries.map(e=>storyCard(e,true)).join("")}</div></div>`:""}
    <div class="advCard"><h3>🌙 Capítulo de ${esc(storyMonthTitle(chapter))}</h3><p class="advMeta">Un resumen de lo que han guardado y vivido en este mes.</p><div class="adventureStats"><div><strong>${monthly.length}</strong><span>momentos</span></div><div><strong>${monthly.filter(e=>e.kind==="memory").length}</strong><span>recuerdos</span></div><div><strong>${monthly.filter(e=>e.kind==="adventure"||e.badge).length}</strong><span>aventuras</span></div></div></div>
    <div class="advCard"><div class="storyHeroActions"><button class="btn ${view==="timeline"?"primary":""}" aria-pressed="${view==="timeline"}" onclick="setStoryView('timeline')">📖 Línea de tiempo</button><button class="btn ${view==="gallery"?"primary":""}" aria-pressed="${view==="gallery"}" onclick="setStoryView('gallery')">🖼️ Galería de fotos</button></div>
    <form class="storyFilters" onsubmit="event.preventDefault();applyStoryFilters()"><label>Mes<select id="storyMonth" onchange="applyStoryFilters()"><option value="">Todos</option>${months.map(m=>`<option value="${esc(m)}" ${storyFilters.month===m?"selected":""}>${esc(storyMonthTitle(m))}</option>`).join("")}</select></label><label>Tipo<select id="storyKind" onchange="applyStoryFilters()"><option value="all">Todos</option>${Object.entries(storyTypes).map(([k,v])=>`<option value="${k}" ${storyFilters.kind===k?"selected":""}>${v[1]}</option>`).join("")}</select></label><label>Orden<select id="storyOrder" onchange="applyStoryFilters()"><option value="newest" ${storyFilters.order==="newest"?"selected":""}>Más recientes</option><option value="oldest" ${storyFilters.order==="oldest"?"selected":""}>Desde el inicio</option></select></label><label>Buscar<input id="storySearch" type="search" placeholder="Un momento, lugar…" value="${esc(storyFilters.query)}"></label><label class="storyFavoriteLabel"><input type="checkbox" id="storyFavorites" ${storyFilters.favorites?"checked":""} onchange="applyStoryFilters()"> Solo favoritos</label><div class="storyHeroActions"><button class="btn primary" type="submit">Buscar</button><button class="btn" type="button" onclick="clearStoryFilters()">Restablecer</button></div></form>
    <p class="advMeta">${filtered.length} momentos · ${view==="gallery"?"Galería":"Línea de tiempo"}</p>
    ${groups.length?groups.map(m=>`<section class="storyChapter"><h3>${esc(storyMonthTitle(m))}</h3><div class="${view==="gallery"?"storyGallery":"storyChapterList"}">${filtered.filter(e=>e.date.startsWith(m)).map(e=>storyCard(e,view==="gallery")).join("")}</div></section>`).join(""):'<div class="advEmpty">No hay momentos que coincidan con los filtros. Guarda un recuerdo o prueba otra búsqueda. ❤️</div>'}</div>
  </section>`;
}
