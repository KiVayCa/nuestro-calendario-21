const adventureCategories = {
  romantica: ["💕","Romántica"], naturaleza: ["🌿","Naturaleza"],
  gastronomia: ["🍜","Gastronomía"], creativa: ["🎨","Creativa"],
  hogar: ["🏡","En casa"], viaje: ["🗺️","Viajes"], especial: ["✨","Especial"],
};
const adventureDefaults = [
  ["Picnic al atardecer","naturaleza"],["Cocinar una receta nueva juntos","gastronomia"],
  ["Una noche de películas y palomitas","hogar"],["Salir a ver las estrellas","naturaleza"],
  ["Escribir cartas para abrir en un año","romantica"],["Pintar juntos un cuadro","creativa"],
  ["Desayuno sorpresa","gastronomia"],["Explorar un pueblo nuevo","viaje"],
  ["Recrear nuestra primera cita","romantica"],["Noche de juegos de mesa","hogar"],
  ["Hacer un álbum de fotos","creativa"],["Ver el amanecer juntos","especial"],
];
let adventureChoice = null;
let adventureBusy = false;
let adventureFilter = "all";
const adventureStatus = {pending:"Pendiente",revealed:"Revelada",done:"Vivida",redeemed:"Canjeado",cancelled:"Cancelada"};
function adventureSecret(a) {
  return a.adventure_secrets?.details || a.adventure_secrets?.[0]?.details || "";
}
function adventureRow(id) { return advCache.adventures.find(a => a.id === id); }
function adventureMemory(a) { return advCache.memories.find(m=>m.id===a.memory_id); }
function adventureTitle(a) { return a.kind==="experience" ? adventureMemory(a)?.title || a.title : a.title; }
function adventureDetails(a) { return a.kind==="experience" ? adventureMemory(a)?.description ?? a.details : a.details; }
function adventureButton(label, action, id, primary = false) {
  return `<button type="button" class="btn ${primary ? "primary" : ""}" data-adventure="${esc(id)}" onclick="${action}(this.dataset.adventure)">${label}</button>`;
}
function renderAdvAdventures() {
  if(adventureFilter==="games")return renderGamesModule();
  const all = advCache.adventures || [];
  const completed = all.filter(a => a.status === "done");
  const pending = all.filter(a => a.status === "pending" && a.kind !== "coupon");
  const coupons = all.filter(a => a.kind === "coupon" && a.status === "pending");
  const shown = all.filter(a => adventureFilter==="all" || (adventureFilter==="experience"&&a.kind==="experience"&&a.status==="pending") || (adventureFilter==="passport"&&a.status==="done") || (["surprise","coupon"].includes(adventureFilter)&&a.kind===adventureFilter));
  const card = a => {
    const own = a.created_by === user?.id;
    const secret = a.kind === "surprise" && adventureSecret(a);
    const hidden = a.kind === "surprise" && a.status === "pending" && !own;
    const icon = a.kind === "coupon" ? "🎟️" : a.kind === "surprise" ? "🎁" : adventureCategories[a.category]?.[0] || "✨";
    const plan = plans.find(p=>p.id===a.plan_id), memory = advCache.memories.find(m=>m.id===a.memory_id);
    let actions = "";
    if (a.kind === "coupon" && a.status === "pending" && !own) actions += adventureButton("Canjear 💗","redeemAdventure",a.id,true);
    if (a.kind === "surprise" && a.status === "pending" && own) actions += adventureButton("Revelar sorpresa 🎁","revealAdventure",a.id,true);
    if ((a.kind==="experience" && a.status==="pending") || (a.kind==="surprise" && a.status==="revealed")) actions += adventureButton("Marcar vivida ✓","completeAdventure",a.id,true);
    if (a.kind !== "coupon" && !hidden && ["pending","revealed"].includes(a.status)) {
      if (!plan) actions += adventureButton("📅 Agendar","scheduleAdventure",a.id);
      actions += adventureButton(plan ? "Cambiar plan" : "Vincular plan","linkAdventurePlan",a.id);
    }
    if (plan) actions += adventureButton("Ver plan","openAdventurePlan",a.id);
    if (a.status === "done" || (a.kind==="experience" && a.status==="pending")) {
      if (!memory) actions += adventureButton("📸 Crear recuerdo","createAdventureMemory",a.id);
      actions += adventureButton(memory ? "Cambiar recuerdo" : "Vincular recuerdo","linkAdventureMemory",a.id);
      if (memory) actions += adventureButton("Ver recuerdo","openAdventureMemory",a.id);
    }
    if (own && a.status==="pending") actions += adventureButton("Cancelar","cancelAdventure",a.id);
    return `<article class="adventureCard" data-advanced-id="${esc(a.id)}">
      <div class="adventureCardTop"><span class="adventureIcon">${icon}</span><div><strong>${esc(adventureTitle(a))}</strong><small>${own?"Creado por ti":"Creado por tu pareja"}${(memory?.memory_date||a.target_date) ? " · "+esc(dateES(memory?.memory_date||a.target_date)) : ""}</small></div><span class="adventureBadge">${esc(adventureStatus[a.status]||a.status)}</span></div>
      ${hidden ? '<p>Tu pareja está preparando algo especial para ti. Los detalles se revelarán cuando decida compartirlos.</p>' : `<p>${esc(secret || adventureDetails(a) || (a.kind==="coupon" ? "Un detalle para disfrutar juntos." : ""))}</p>`}
      ${plan ? `<small>🗓️ ${esc(plan.title)}</small>` : ""}${memory ? `<div class="adventureMemory">${memory.photo_url ? `<div class="adventurePhotoFrame"><img alt="Foto de la experiencia" data-memory-path="${esc(memory.photo_url)}" onclick="openMemoryPhoto(this)" style="cursor:zoom-in;${photoFrameStyle(memory)}"></div>` : "📸"}<div><span>${esc(memory.title)}</span>${memory.photo_url?`<br><button class="btn" data-memory="${esc(memory.id)}" onclick="openMemoryFrame(this.dataset.memory)">Ajustar foto</button>`:""}${memory.place_id && advCache.places?.some(p=>p.id===memory.place_id) ? "<br>📍 "+placeLinkHtml(memory.place_id,advCache.places.find(p=>p.id===memory.place_id).name) : memory.location ? "<br>📍 "+esc(memory.location) : ""}</div></div>` : ""}
      <div class="adventureActions">${actions}</div></article>`;
  };
  return `<section class="bond adventureModule">
    <div class="bondHero"><div class="bondHeroHeart">🧭</div><small>COLECCIONEMOS MOMENTOS</small><h2>Nuestras aventuras</h2><p>Un mundo de primeras veces, pequeñas locuras y recuerdos juntos.</p></div>
    <div class="adventureStats"><div><strong>${pending.length}</strong><span>por vivir</span></div><div><strong>${completed.length}</strong><span>sellos del pasaporte</span></div><div><strong>${coupons.length}</strong><span>cupones activos</span></div></div>
    <div class="advCard"><div class="adventureFilters">${[["all","Todo"],["discover","🎡 Descubrir"],["experience","🗺️ Por vivir"],["surprise","🎁 Sorpresas"],["coupon","🎟️ Cupones"],["passport","🏆 Pasaporte"],["games","🎮 Juegos"]].map(([k,v])=>`<button class="btn ${adventureFilter===k?"primary":""}" aria-pressed="${adventureFilter===k}" onclick="setAdventureFilter('${k}')">${v}</button>`).join("")}</div></div>
    ${["all","discover"].includes(adventureFilter)?`<div class="advCard adventureRoulette"><h3>🎡 Ruleta de citas</h3><p>¿No saben qué hacer? Dejen que el azar elija su próxima aventura.</p><div class="adventureWheel" aria-hidden="true"><span>♡</span></div><div id="adventureChoice" aria-live="polite">${adventureChoice ? esc(adventureChoice.title) : "¡Giren para descubrir una cita!"}</div><div class="adventureActions"><button class="btn primary" onclick="spinAdventure()">Girar ruleta 🎡</button><button class="btn" id="adventureSaveChoice" onclick="saveAdventureChoice()" ${adventureChoice&&!adventureChoice.id?"":"disabled"}>Guardar experiencia</button><button class="btn" id="adventureScheduleChoice" onclick="scheduleAdventureChoice()" ${adventureChoice?"":"disabled"}>Agendar cita</button></div></div>${renderAdventureIdeas()}`:""}
    <div class="adventureCreate"><button class="bondGesture" onclick="openAdventureForm('experience')"><span>🗺️</span><strong>Nueva experiencia</strong><small>Una lista para los dos</small></button><button class="bondGesture" onclick="openAdventureForm('surprise')"><span>🎁</span><strong>Plan sorpresa</strong><small>Detalles secretos</small></button><button class="bondGesture" onclick="openAdventureForm('coupon')"><span>🎟️</span><strong>Cupón de amor</strong><small>Regala un detalle</small></button></div>
    ${["all","passport"].includes(adventureFilter)?`<div class="advCard"><h3>🏆 Pasaporte de pareja</h3><p>Cada aventura vivida deja un sello en su historia.</p><div class="adventureStamps">${completed.map(a=>`<div class="adventureStamp"><span>${adventureCategories[a.category]?.[0] || "✨"}</span><strong>${esc(adventureTitle(a))}</strong><small>${adventureMemory(a)?.memory_date ? esc(dateES(adventureMemory(a).memory_date)) : a.completed_at ? esc(new Date(a.completed_at).toLocaleDateString("es-CO",{timeZone:"America/Bogota"})) : ""}</small></div>`).join("") || '<div class="advEmpty">Su primer sello está esperando. ¡Vivan una aventura!</div>'}</div></div>`:""}
    ${adventureFilter!=="discover"?`<div class="advCard"><h3>Nuestros planes y detalles</h3><div class="adventureList">${shown.map(card).join("")||'<div class="advEmpty">Aún no hay aventuras en esta lista.</div>'}</div></div>`:""}
  </section>`;
}
function setAdventureFilter(value) {
  if (!["all","discover","experience","surprise","coupon","passport","games"].includes(value)) return;
  adventureFilter=value; renderAdvanced();
}
function spinAdventure() {
  const pool = [
    ...adventureDefaults.map(([title,category])=>({title,category,details:""})),
    ...advCache.ideas.map(a=>({title:a.title,category:"especial",details:a.description||"",ideaId:a.id,place_id:a.place_id})),
    ...advCache.adventures.filter(a=>a.kind==="experience"&&a.status==="pending").map(a=>({...a,title:adventureTitle(a),details:adventureDetails(a)})),
  ];
  const candidates = pool.filter(a=>a.title!==adventureChoice?.title);
  adventureChoice = (candidates.length ? candidates : pool)[Math.floor(Math.random()*(candidates.length || pool.length))];
  const wheel = document.querySelector(".adventureWheel");
  wheel?.classList.remove("adventureSpin");
  if(wheel) { void wheel.offsetWidth; wheel.classList.add("adventureSpin"); }
  $("adventureChoice").textContent=adventureChoice.title;
  $("adventureSaveChoice").disabled=Boolean(adventureChoice.id);
  $("adventureScheduleChoice").disabled=false;
}
function saveAdventureChoice() {
  if (adventureChoice?.ideaId) return openIdeaAsAdventure(adventureChoice.ideaId);
  if (adventureChoice && !adventureChoice.id) openAdventureForm("experience",adventureChoice);
}
function scheduleAdventureChoice() {
  if (!adventureChoice) return;
  if(adventureChoice.ideaId)return scheduleIdea(adventureChoice.ideaId);
  if(adventureChoice.id) return scheduleAdventure(adventureChoice.id);
  showAdvancedTab("calendar"); openModal(localISODate());
  $("title").value=adventureChoice.title; $("noteInput").value=adventureChoice.details||"";
}
function openAdventureForm(kind, prefill = {}) {
  if (!["experience","surprise","coupon"].includes(kind)) return;
  if (kind==="experience") {
    window.openMemoryForm();
    $("advModalTitle").textContent="Nueva experiencia y recuerdo 🗺️";
    $("advModalBody").querySelector(".advForm").insertAdjacentHTML("afterbegin",
      '<p class="advMeta">Se guardará una experiencia y su recuerdo vinculado, con la misma foto y lugar. Puedes marcarla como vivida o pendiente.</p>'+
      select("experience_status","Estado",[["pending","Por vivir"],["done","Ya la vivimos"]])+
      select("experience_category","Tipo de experiencia",Object.entries(adventureCategories).map(([k,v])=>[k,v.join(" ")]))+
      '<input type="hidden" id="adventureMemoryOrigin" value="new">');
    $("adv_title").value=prefill.title||"";
    $("adv_title").maxLength=120;
    $("adv_description").value=prefill.details||"";
    $("adv_description").maxLength=1000;
    $("adv_experience_category").value=prefill.category||"romantica";
    $("adv_experience_status").value=prefill.title?"pending":"done";
    return;
  }
  const names={experience:"Nueva experiencia 🗺️",surprise:"Cita sorpresa 🎁",coupon:"Nuevo cupón 🎟️"};
  openAdvModal(names[kind], formShell(
    (kind==="surprise" ? '<p class="advMeta">Tu pareja verá solo «Cita sorpresa» y la fecha. Los detalles permanecen privados hasta que los reveles.</p>' : input("adventure_title",kind==="coupon"?"¿Qué le regalas?":"Nombre de la experiencia","text",'maxlength="120"'))+
    textarea("adventure_details",kind==="surprise"?"Detalles secretos":"Detalles",kind==="coupon"?"Ej. Un desayuno en la cama":"¿Qué tienen planeado?")+
    (kind==="experience"?select("adventure_category","Categoría",Object.entries(adventureCategories).map(([k,v])=>[k,v.join(" ")])):"")+
    (kind!=="coupon"?input("adventure_date","Fecha (opcional)","date"):""),
    `saveAdventure('${kind}')`));
  if ($("adv_adventure_title")) $("adv_adventure_title").value=prefill.title||"";
  $("adv_adventure_details").value=prefill.details||"";
  $("adv_adventure_details").maxLength=1000;
  if ($("adv_adventure_category")) $("adv_adventure_category").value=prefill.category||"romantica";
}
async function saveAdventure(kind) {
  if(adventureBusy||!user||!couple) return;
  const title=$("adv_adventure_title")?.value.trim()||"";
  const details=$("adv_adventure_details").value.trim();
  if ((kind==="surprise"&&!details)||(kind!=="surprise"&&!title)) return appAlert("Completa los detalles ❤️");
  adventureBusy=true;
  const account=user.id,space=couple.id;
  try {
    const {data,error}=await sb.rpc("create_adventure",{p_couple_id:space,p_kind:kind,p_title:title,p_details:details,p_category:$("adv_adventure_category")?.value||"especial",p_date:$("adv_adventure_date")?.value||null});
    if(error) throw error;
    if(user?.id!==account||couple?.id!==space) return;
    adventureFilter=kind==="surprise"?"surprise":kind==="coupon"?"coupon":"all";
    closeAdvModal(); await advLoadAll();
    showAppToast("¡Guardado con amor! ❤️");
    await createPartnerNotification({event_type:"adventure_created",title:kind==="surprise"?"🎁 Tu pareja prepara una sorpresa":kind==="coupon"?"🎟️ Tienes un cupón de amor":"🧭 Una nueva aventura los espera",body:"Descúbrela en Nuestras aventuras.",target_tab:"aventuras",target_id:data});
  } catch(error) { appAlert("No se pudo guardar: "+error.message); }
  finally { adventureBusy=false; }
}
async function updateAdventure(id, changes, message, expectedStatus) {
  if(adventureBusy||!couple||!user) return false;
  adventureBusy=true;
  const account=user.id,space=couple.id;
  try {
    let query=sb.from("couple_adventures").update(changes).eq("id",id).eq("couple_id",space);
    if(expectedStatus) query=query.eq("status",expectedStatus);
    const {data,error}=await query.select("id").single();
    if(error||!data) throw error||new Error("El detalle ya cambió.");
    if(user?.id!==account||couple?.id!==space) return false;
    await advLoadAll();
    showAppToast(message);
    await createPartnerNotification({event_type:"adventure_updated",title:"🧭 Novedad en Nuestras aventuras",body:message,target_tab:"aventuras",target_id:id});
    return true;
  } catch(error) { showAppToast("No pudimos actualizarlo. Revisa su estado.", "error"); return false; }
  finally { adventureBusy=false; }
}
async function changeAdventureStatus(id,status,message,question) {
  const a=adventureRow(id); if(!a) return;
  if(question && !await appConfirm(question,"Confirmar",false)) return;
  await updateAdventure(id,{status},message,a.status);
}
function redeemAdventure(id) { return changeAdventureStatus(id,"redeemed","¡Cupón canjeado! 🎟️","¿Quieres canjear este cupón una sola vez?"); }
function revealAdventure(id) { return changeAdventureStatus(id,"revealed","¡Sorpresa revelada! 🎁","¿Compartir ahora los detalles secretos con tu pareja?"); }
function completeAdventure(id) { return changeAdventureStatus(id,"done","¡Nuevo sello en su pasaporte! 🏆"); }
function cancelAdventure(id) { return changeAdventureStatus(id,"cancelled","Detalle cancelado.","¿Cancelar este detalle?"); }
function scheduleAdventure(id) {
  const a=adventureRow(id); if(!a) return;
  if(a.plan_id && plans.some(p=>p.id===a.plan_id)) return openAdventurePlan(id);
  const memory=adventureMemory(a);
  showAdvancedTab("calendar"); openModal(memory?.memory_date||a.target_date||localISODate());
  $("modal").dataset.adventureId=id;
  $("title").value=adventureTitle(a);
  $("noteInput").value=a.kind==="surprise"?"":adventureDetails(a)||"";
  if ($("planPlaceId")) $("planPlaceId").value=memory?.place_id||"";
}
function openAdventurePlan(id) { const a=adventureRow(id); if(a?.plan_id) navigateToItem("calendar",a.plan_id); }
function openAdventureMemory(id) { const a=adventureRow(id); if(a?.memory_id) navigateToItem("memories",a.memory_id); }
function createAdventureMemory(id) {
  const a=adventureRow(id); if(!a) return;
  window.openMemoryForm(); $("adv_title").value=a.title; $("adv_description").value=a.kind==="surprise"?"":a.details||"";
  if(a.target_date) $("adv_memory_date").value=a.target_date;
  const origin=document.createElement("input"); origin.type="hidden"; origin.id="adventureMemoryOrigin"; origin.value=id;
  $("advModalBody").append(origin);
}
function linkAdventurePlan(id) { openAdventureLink(id,"plan_id",plans); }
function linkAdventureMemory(id) { openAdventureLink(id,"memory_id",advCache.memories); }
function openAdventureLink(id,field,items) {
  const a=adventureRow(id); if(!a) return;
  const isPlan=field==="plan_id";
  openAdvModal(isPlan?"Vincular un plan":"Vincular un recuerdo",formShell(select("adventure_link","Selecciona",[["","Sin vínculo"],...items.map(x=>[esc(x.id),esc(x.title+" · "+dateES(x.plan_date||x.memory_date))])]),`saveAdventureLink('${id}','${field}')`));
  $("adv_adventure_link").value=a[field]||"";
}
async function saveAdventureLink(id,field) {
  if(!["plan_id","memory_id"].includes(field)) return;
  if(await updateAdventure(id,{[field]:$("adv_adventure_link").value||null},"Vínculo actualizado. ❤️")) closeAdvModal();
}
