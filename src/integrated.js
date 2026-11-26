let dreamsGoalsView="dreams";
function setDreamsGoalsView(value){if(!["dreams","savings"].includes(value))return;dreamsGoalsView=value;renderAdvanced();}
function renderDreamsAndGoals(){
  return `<section class="integratedModule"><div class="bondHero"><div class="bondHeroHeart">✨</div><small>SOÑAR · AHORRAR · CONSTRUIR</small><h2>Nuestros sueños y metas</h2><p>Un sueño puede tener una meta de ahorro, sin duplicar sus saldos. Nuestro futuro sigue organizando los pasos.</p><div class="adventureActions" style="justify-content:center"><button class="btn ${dreamsGoalsView==="dreams"?"primary":""}" onclick="setDreamsGoalsView('dreams')">✨ Sueños</button><button class="btn ${dreamsGoalsView==="savings"?"primary":""}" onclick="setDreamsGoalsView('savings')">💰 Metas de ahorro</button><button class="btn" onclick="showAdvancedTab('futuro')">🌱 Proyectos</button></div></div>${dreamsGoalsView==="savings"?renderAdvGoals():renderAdvDreams()}</section>`;
}
function dreamSavingsSelector(){
  return select("dream_goal","Vincular meta de ahorro (opcional)",[["","Sin ahorro vinculado"],...advCache.goals.map(g=>[esc(g.id),esc(g.title)])]);
}
function dreamSavingsCard(dream){
  const goal=advCache.goals.find(g=>g.id===dream.goal_id);
  return goal?renderFutureGoal(goal):`<div class="advActions"><button class="btn" data-dream="${esc(dream.id)}" onclick="createDreamSavings(this.dataset.dream)">💰 Crear meta de ahorro</button></div>`;
}
function createDreamSavings(id){
  const dream=advCache.dreams.find(d=>d.id===id);
  if(!dream)return;
  window.openGoalForm();
  $("adv_title").value=dream.title;$("adv_description").value=dream.description||"";
  $("adv_target_amount").value=dream.budget??"";$("adv_target_date").value=dream.target_date||"";
  if($("adv_place_id"))$("adv_place_id").value=dream.place_id||"";
  const origin=document.createElement("input");origin.type="hidden";origin.id="dreamGoalOrigin";origin.value=id;$("advModalBody").append(origin);
}
async function linkDreamSavings(dreamId,goalId){
  const {error}=await sb.from("dreams").update({goal_id:goalId}).eq("id",dreamId).eq("couple_id",couple.id);
  if(error)showAppToast("La meta se guardó; puedes vincularla desde Editar sueño.","error");
}
function renderAdventureIdeas(){
  return `<div class="advCard"><div class="futureHeading"><h3>🎲 ¿Qué hacemos?</h3><button class="btn primary" onclick="openIdeaForm()">＋ Nueva idea</button></div><p class="advMeta">Guarden sus propias citas. También participan en la ruleta de arriba.</p><div class="adventureList">${advCache.ideas.map(x=>`<article class="adventureCard" data-advanced-id="${esc(x.id)}"><strong>🎲 ${esc(x.title)}</strong><div class="advMeta">${esc(x.category)}${x.estimated_budget?" · "+esc(money(x.estimated_budget)):""}${x.place_id&&advCache.places.find(p=>p.id===x.place_id)?" · 📍 "+placeLinkHtml(x.place_id,advCache.places.find(p=>p.id===x.place_id).name):""}</div><p>${esc(x.description||"")}</p><div class="adventureActions"><button class="btn primary" data-idea="${esc(x.id)}" onclick="scheduleIdea(this.dataset.idea)">📅 Agendar</button><button class="btn" data-idea="${esc(x.id)}" onclick="openIdeaAsAdventure(this.dataset.idea)">Guardar experiencia</button><button class="btn" data-idea="${esc(x.id)}" onclick="openAdvancedEdit('ideas',this.dataset.idea)">Editar</button><button class="btn danger" data-idea="${esc(x.id)}" onclick="deleteAdvanced('ideas',this.dataset.idea)">Eliminar</button></div></article>`).join("")||'<div class="advEmpty">Todavía no tienen ideas propias.</div>'}</div></div>`;
}
function openIdeaAsAdventure(id){
  const idea=advCache.ideas.find(x=>x.id===id);if(!idea)return;
  openAdventureForm("experience",{title:idea.title,details:idea.description||"",category:"especial"});
  if($("adv_place_id"))$("adv_place_id").value=idea.place_id||"";
}
