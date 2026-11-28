const futureTypes = {
  marriage: ["💍","Matrimonio","Nuestro matrimonio",["Conversar sobre valores y expectativas","Definir fecha y presupuesto","Preparación prematrimonial","Organizar ceremonia y celebración","Revisar documentos y acuerdos del hogar"]],
  home: ["🏡","Vivienda","Nuestro hogar",["Definir necesidades de vivienda","Comparar ubicaciones y opciones","Revisar ahorro y presupuesto","Investigar requisitos de financiación","Planear la mudanza"]],
  travel: ["✈️","Viajes y luna de miel","Nuestro próximo viaje",["Elegir destino y temporada","Estimar presupuesto","Revisar documentos","Comparar transporte y alojamiento","Planificar experiencias"]],
  family: ["👨‍👩‍👧","Proyecto familiar","Nuestra futura familia",["Conversar sobre expectativas familiares","Acordar prioridades y tiempos","Revisar red de apoyo","Planear responsabilidades compartidas"]],
  faith: ["🙏","Propósitos espirituales","Crecer juntos en la fe",["Acordar un hábito de oración","Reservar un momento de lectura bíblica","Elegir una actividad de servicio","Revisar juntos lo aprendido"]],
  personal: ["🎯","Crecimiento y metas","Crecer juntos",["Definir el objetivo","Identificar recursos y tiempo","Acordar primeros pasos","Revisar avances"]],
  other: ["✨","Otros sueños","Nuevo proyecto",["Definir el propósito","Acordar el primer paso"]],
};
const futureStatuses={planned:"Por comenzar",active:"En camino",paused:"En pausa",done:"Cumplido"};
const futureHorizons={all:"Todos",short:"Corto plazo",medium:"Mediano plazo",long:"Largo plazo",undated:"Sin fecha"};
let futureFilter="all", futureBusy=false;
function futureHorizon(date,today=countdownToday()) {
  if(!date)return "undated";
  const days=(Date.parse(date)-Date.parse(today))/86400000;
  return days<=365?"short":days<=1095?"medium":"long";
}
function futureProject(id){return (advCache.futureProjects||[]).find(x=>x.id===id);}
function futureStep(id){return (advCache.futureSteps||[]).find(x=>x.id===id);}
function futureStepDate(s){return plans.find(p=>p.id===s.plan_id)?.plan_date||s.target_date;}
function futureProgress(steps){return steps.length?Math.round(100*steps.filter(x=>x.done).length/steps.length):0;}
function futureButton(label,action,id,primary=false){
  return `<button type="button" class="btn ${primary?"primary":""}" data-future="${esc(id)}" onclick="${action}(this.dataset.future)">${label}</button>`;
}
function futureLinkOptions(items,empty){
  return [["",empty],...items.map(x=>[esc(x.id),esc(x.title)])];
}
function renderFutureGoal(goal) {
  if(!goal)return "";
  const target=Number(goal.target_amount||0), saved=Number(goal.current_amount||0);
  const percent=target>0?Math.max(0,Math.min(100,Math.round(saved/target*100))):0;
  return `<div class="futureSavings"><small>💰 AHORRO VINCULADO</small><strong>${esc(goal.title)}</strong><p>${esc(money(saved))}${target>0?" de "+esc(money(target)):" ahorrados"}</p>${target>0?`<div class="progress"><span style="width:${percent}%"></span></div><small>${percent}% del objetivo · Falta ${esc(money(Math.max(0,target-saved)))}</small>`:""}<button class="btn" data-future="${esc(goal.id)}" onclick="navigateToItem('goals',this.dataset.future)">Ver meta y aportar</button></div>`;
}
function renderAdvFuture() {
  const projects=advCache.futureProjects||[], steps=advCache.futureSteps||[];
  const today=countdownToday(), shown=projects.filter(p=>futureFilter==="all"||futureHorizon(p.target_date,today)===futureFilter);
  const allDone=projects.filter(p=>p.status==="done").length;
  const timeline=[...projects.filter(p=>p.target_date).map(p=>({date:p.target_date,title:p.title,id:p.id,done:p.status==="done",type:futureTypes[p.category][0]})),
    ...steps.filter(s=>futureStepDate(s)&&projects.some(p=>p.id===s.project_id)).map(s=>({date:futureStepDate(s),title:s.title,id:s.project_id,done:s.done,type:"📌"}))]
    .sort((a,b)=>a.date.localeCompare(b.date));
  const card=p=>{
    const type=futureTypes[p.category]||futureTypes.other, items=steps.filter(s=>s.project_id===p.id).sort((a,b)=>(futureStepDate(a)||"9999").localeCompare(futureStepDate(b)||"9999")||(a.created_at||"").localeCompare(b.created_at||""));
    const pct=futureProgress(items), goal=advCache.goals.find(g=>g.id===p.goal_id), dream=advCache.dreams.find(d=>d.id===p.dream_id);
    return `<article class="adventureCard futureProject" data-advanced-id="${esc(p.id)}"><div class="adventureCardTop"><span class="adventureIcon">${type[0]}</span><div><strong>${esc(p.title)}</strong><small>${type[1]} · ${futureHorizons[futureHorizon(p.target_date,today)]}</small></div><span class="adventureBadge">${esc(futureStatuses[p.status])}</span></div>
    ${p.description?`<p>${esc(p.description)}</p>`:""}${p.target_date?`<div class="advMeta">📅 Fecha objetivo: ${esc(dateES(p.target_date))}${p.target_date<today&&p.status!=="done"?" · Por revisar":""}</div>`:""}
    <div class="futureProgress"><div><strong>Avance de pasos</strong><span>${items.filter(s=>s.done).length}/${items.length} · ${pct}%</span></div><div class="progress"><span style="width:${pct}%"></span></div></div>
    ${renderFutureGoal(goal)}${dream?`<div class="advMeta">✨ Sueño vinculado: ${esc(dream.title)} <button class="btn" data-future="${esc(dream.id)}" onclick="navigateToItem('dreams',this.dataset.future)">Ver sueño</button></div>`:""}
    <div class="futureChecklist"><h4>Pasos para hacerlo realidad</h4>${items.map(s=>{
      const plan=plans.find(x=>x.id===s.plan_id);
      return `<div class="futureStep ${s.done?"futureStepDone":""}"><button class="futureCheck" aria-label="${s.done?"Reabrir paso":"Completar paso"}" aria-pressed="${s.done}" data-future="${esc(s.id)}" onclick="toggleFutureStep(this.dataset.future)">${s.done?"✓":"○"}</button><div><strong>${esc(s.title)}</strong><small>${futureStepDate(s)?esc(dateES(futureStepDate(s))):"Sin fecha"}${plan?" · 🗓️ "+esc(plan.title):""}</small></div><div class="futureStepActions">${plan?futureButton("Ver plan","openFuturePlan",s.id):futureButton("Agendar","scheduleFutureStep",s.id)}${futureButton("Editar","openFutureStepEdit",s.id)}</div></div>`;
    }).join("")||'<div class="advEmpty">Añadan un primer paso.</div>'}</div>
    <div class="adventureActions">${futureButton("＋ Añadir paso","openFutureStep",p.id,true)}${futureButton("Editar proyecto","editFutureProject",p.id)}${futureButton(p.status==="done"?"Reabrir":"Marcar cumplido","toggleFutureProject",p.id)}${futureButton("Eliminar","deleteFutureProject",p.id)}</div></article>`;
  };
  return `<section class="bond futureModule"><div class="bondHero"><div class="bondHeroHeart">🌱</div><small>CONSTRUYENDO NUESTRO MAÑANA</small><h2>Nuestro futuro</h2><p>Encomienden sus planes a Dios y den un paso a la vez. Cada sueño comienza con una decisión.</p></div>
    <div class="adventureStats"><div><strong>${projects.length-allDone}</strong><span>proyectos en camino</span></div><div><strong>${allDone}</strong><span>sueños cumplidos</span></div><div><strong>${steps.filter(s=>s.done).length}</strong><span>pasos realizados</span></div></div>
    <div class="advCard"><h3>¿Qué quieren construir juntos?</h3><div class="futureTypes">${Object.entries(futureTypes).map(([k,v])=>`<button class="bondGesture" onclick="openFutureProject('${k}')"><span>${v[0]}</span><strong>${v[1]}</strong></button>`).join("")}</div><button class="btn" onclick="showAdvancedTab('matrimonio')">💍 Organizar nuestro matrimonio</button></div>
    <div class="advCard"><div class="futureHeading"><h3>🗺️ Nuestra línea de tiempo</h3><button class="btn" onclick="openFutureProject()">Nuevo proyecto</button></div><div class="futureTimeline">${timeline.map(t=>`<button type="button" class="futureTimelineItem" data-future="${esc(t.id)}" onclick="navigateToItem('futuro',this.dataset.future)"><span>${t.done?"✓":t.type}</span><div><small>${esc(dateES(t.date))}</small><strong>${esc(t.title)}</strong></div></button>`).join("")||'<div class="advEmpty">Las fechas de sus proyectos y pasos aparecerán aquí.</div>'}</div></div>
    <div class="advCard"><h3>🎯 Proyectos de vida</h3><p class="advMeta">Corto plazo: hasta un año · Mediano: hasta tres años · Largo: más de tres años.</p><div class="adventureFilters">${Object.entries(futureHorizons).map(([k,v])=>`<button class="btn ${futureFilter===k?"primary":""}" onclick="filterFuture('${k}')" aria-pressed="${futureFilter===k}">${v}</button>`).join("")}</div><div class="adventureList">${shown.map(card).join("")||'<div class="advEmpty">Aún no hay proyectos en este plazo. ¡Empiecen con un sueño!</div>'}</div></div>
    <div class="advCard"><h3>🙏 Encomienden sus planes</h3><p>El camino también se construye con oración, paciencia y sabiduría. Proverbios 16:3.</p><button class="btn" onclick="showAdvancedTab('fe')">Ir a Nuestra fe</button></div></section>`;
}
function filterFuture(k){if(!futureHorizons[k])return;futureFilter=k;renderAdvanced();}
function openFutureProject(category="other",id=null){
  const p=id?futureProject(id):null;
  if(p)category=p.category;
  const type=futureTypes[category]||futureTypes.other;
  openAdvModal(p?"Editar proyecto":"Nuevo proyecto "+type[0],formShell(
    input("future_title","Nombre del proyecto","text",'maxlength="120"')+
    select("future_category","Área",Object.entries(futureTypes).map(([k,v])=>[k,v[0]+" "+v[1]]))+
    textarea("future_description","Propósito","¿Qué quieren construir juntos?")+
    input("future_date","Fecha objetivo (opcional)","date")+
    select("future_status","Estado",Object.entries(futureStatuses))+
    select("future_goal","Meta de ahorro existente",futureLinkOptions(advCache.goals,"Sin meta vinculada"))+
    select("future_dream","Sueño existente",futureLinkOptions(advCache.dreams,"Sin sueño vinculado"))+
    (!p?'<div class="futureSuggestedField"><label class="futureSuggestedLabel" for="futureSuggested"><input id="futureSuggested" type="checkbox" aria-describedby="futureSuggestions" checked><span>Añadir pasos sugeridos para esta categoría</span></label><div id="futureSuggestions" class="advMeta"></div></div>':""),
    `saveFutureProject('${id||""}')`));
  $("adv_future_title").value=p?.title||type[2];
  $("adv_future_category").value=category;
  $("adv_future_description").value=p?.description||"";$("adv_future_description").maxLength=2000;
  $("adv_future_date").value=p?.target_date||"";
  $("adv_future_status").value=p?.status||"planned";
  $("adv_future_goal").value=p?.goal_id||"";$("adv_future_dream").value=p?.dream_id||"";
  if(!p){$("adv_future_category").addEventListener("change",renderFutureSuggestions);renderFutureSuggestions();}
}
function renderFutureSuggestions(){
  const t=futureTypes[$("adv_future_category").value]||futureTypes.other;
  $("futureSuggestions").textContent=t[3].join(" · ");
}
function editFutureProject(id){openFutureProject("other",id);}
async function futureMutation(work,message,targetId=null,notify=true){
  if(futureBusy||!user||!couple)return false;
  futureBusy=true;const account=user.id,space=couple.id;
  try{
    const {data,error}=await work(space,account);
    if(error)throw error;
    if(user?.id!==account||couple?.id!==space)return false;
    await advLoadAll(["futureProjects","futureSteps"]);
    showAppToast(message);
    if(notify)await createPartnerNotification({event_type:"future_updated",title:"🌱 Novedad en Nuestro futuro",body:"Revisen sus proyectos y pasos compartidos.",target_tab:"futuro",target_id:targetId||data?.id||(typeof data==="string"?data:null)});
    return true;
  }catch(error){showAppToast("No se pudo guardar. "+(error?.message||"Inténtalo de nuevo."),"error");return false;}
  finally{futureBusy=false;}
}
async function saveFutureProject(id){
  const title=$("adv_future_title").value.trim(),description=$("adv_future_description").value.trim(),category=$("adv_future_category").value,status=$("adv_future_status").value,target_date=$("adv_future_date").value||null,goal_id=$("adv_future_goal").value||null,dream_id=$("adv_future_dream").value||null;
  if(!title||title.length>120||description.length>2000||!futureTypes[category]||!futureStatuses[status])return appAlert("Revisa el nombre y los datos del proyecto.");
  const draft={title,description,category,status,target_date,goal_id,dream_id};
  const suggestions=$("futureSuggested")?.checked?futureTypes[category][3]:[];
  const ok=await futureMutation(space=>id?sb.from("couple_future_projects").update(draft).eq("id",id).eq("couple_id",space).select("id").single():sb.rpc("create_future_project",{p_couple_id:space,p_title:title,p_description:description,p_category:category,p_status:status,p_target_date:target_date,p_goal_id:goal_id,p_dream_id:dream_id,p_steps:suggestions}),"Proyecto guardado. 🌱",id||null);
  if(ok){futureFilter="all";closeAdvModal();if(advancedTab==="futuro")renderAdvanced();}
}
function toggleFutureProject(id){
  const p=futureProject(id);if(!p)return;
  return futureMutation(space=>sb.from("couple_future_projects").update({status:p.status==="done"?"active":"done"}).eq("id",id).eq("couple_id",space).select("id").single(),p.status==="done"?"Proyecto reabierto.":"¡Un sueño cumplido! 🎉",id);
}
async function deleteFutureProject(id){
  if(!futureProject(id)||!await appConfirm("¿Eliminar este proyecto y sus pasos? Los planes, metas y sueños vinculados se conservarán.","Eliminar proyecto",true))return;
  return futureMutation(space=>sb.from("couple_future_projects").delete().eq("id",id).eq("couple_id",space).select("id").single(),"Proyecto eliminado.",null,false);
}
function openFutureStep(projectId,id=null){
  const s=id?futureStep(id):null;
  if(!futureProject(projectId))return;
  openAdvModal(s?"Editar paso":"Añadir paso",formShell(input("step_title","¿Qué necesitan hacer?","text",'maxlength="120"')+input("step_date","Fecha (opcional)","date")+select("step_plan","Plan del calendario existente",futureLinkOptions(plans,"Sin plan vinculado"))+(s?'<button class="btn danger" data-future="'+esc(s.id)+'" onclick="deleteFutureStep(this.dataset.future)">Eliminar paso</button>':""),`saveFutureStep('${projectId}','${id||""}')`));
  $("adv_step_title").value=s?.title||"";$("adv_step_date").value=s?.target_date||"";$("adv_step_plan").value=s?.plan_id||"";
}
function openFutureStepEdit(id){const s=futureStep(id);if(s)openFutureStep(s.project_id,id);}
async function saveFutureStep(projectId,id){
  const title=$("adv_step_title").value.trim(),target_date=$("adv_step_date").value||null,plan_id=$("adv_step_plan").value||null;
  if(!title||title.length>120)return appAlert("Escribe el nombre del paso.");
  const patch={title,target_date,plan_id};
  const ok=await futureMutation((space,account)=>id?sb.from("couple_future_steps").update(patch).eq("id",id).eq("couple_id",space).select("id").single():sb.from("couple_future_steps").insert({...patch,couple_id:space,project_id:projectId,created_by:account}).select("id").single(),"Paso guardado. 🌱",projectId);
  if(ok)closeAdvModal();
}
function toggleFutureStep(id){
  const s=futureStep(id);if(!s)return;
  return futureMutation(space=>sb.from("couple_future_steps").update({done:!s.done}).eq("id",id).eq("couple_id",space).select("id").single(),s.done?"Paso reabierto.":"¡Un paso más! ✓",s.project_id);
}
async function deleteFutureStep(id){
  const s=futureStep(id);if(!s||!await appConfirm("¿Eliminar este paso? Su plan vinculado se conservará.","Eliminar paso",true))return;
  if(await futureMutation(space=>sb.from("couple_future_steps").delete().eq("id",id).eq("couple_id",space).select("id").single(),"Paso eliminado.",s.project_id))closeAdvModal();
}
function openFuturePlan(id){const s=futureStep(id);if(s?.plan_id)navigateToItem("calendar",s.plan_id);}
function scheduleFutureStep(id){
  const s=futureStep(id),p=s&&futureProject(s.project_id);if(!s||!p)return;
  if(s.plan_id&&plans.some(x=>x.id===s.plan_id))return openFuturePlan(id);
  showAdvancedTab("calendar");openModal(s.target_date||p.target_date||countdownToday());
  $("modal").dataset.futureStepId=id;$("title").value=s.title;$("noteInput").value="Proyecto: "+p.title;
}
function linkFutureCreatedPlan(id,planId){
  const s=futureStep(id);if(!s)return;
  return futureMutation(space=>sb.from("couple_future_steps").update({plan_id:planId}).eq("id",id).eq("couple_id",space).select("id").single(),"Plan vinculado a su proyecto. 🌱",s.project_id,false);
}
