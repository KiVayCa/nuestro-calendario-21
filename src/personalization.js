const personalModules={
  home:"🏠 Inicio",vinculo:"💞 Nuestro vínculo",aventuras:"🧭 Nuestras aventuras",fe:"🙏 Nuestra fe",
  futuro:"🌱 Nuestro futuro",calendar:"🗓️ Calendario",story:"📖 Historia",memories:"📸 Recuerdos",
  letters:"💌 Cartas",dreams:"✨ Sueños",challenges:"🎯 Retos",ideas:"🎲 ¿Qué hacemos?",dates:"📅 Fechas",
  goals:"💰 Metas",budget:"🧾 Presupuesto",question:"💭 Pregunta",places:"📍 Lugares",
  analysis:"📊 Análisis",achievements:"🏆 Logros",private:"🔐 Privado",settings:"⚙️ Configuración"
};
const personalRequired=new Set(["home","calendar","settings"]);
const personalSections={stats:"Contadores",next:"Próximo plan",recap:"Resumen del mes",countdown:"Cuenta regresiva",week:"Próximos siete días",question:"Pregunta diaria",summary:"Resumen de sueños, cartas, retos y metas"};
let personalDraft=null, personalBusy=false;
function cleanPersonalList(list,choices){
  return Array.isArray(list)?[...new Set(list.filter(x=>typeof x==="string"&&choices.includes(x)))]:[];
}
function normalizePersonalPreferences(value={}){
  const all=Object.keys(personalModules), order=cleanPersonalList(value.module_order,all);
  return {
    module_order:[...order,...all.filter(x=>!order.includes(x))],
    hidden_modules:cleanPersonalList(value.hidden_modules,all).filter(x=>!personalRequired.has(x)),
    shortcuts:cleanPersonalList(value.shortcuts,all).filter(x=>x!=="home"&&x!=="settings").slice(0,6),
    home_sections:Array.isArray(value.home_sections)?cleanPersonalList(value.home_sections,Object.keys(personalSections)):Object.keys(personalSections),
    density:value.density==="compact"?"compact":"comfortable",
    text_size:value.text_size==="large"?"large":"normal",
    motion:value.motion==="reduced"?"reduced":"system"
  };
}
function currentPersonalPreferences(){
  return normalizePersonalPreferences(advCache.personalPrefs?.find(p=>p.user_id===user?.id&&p.couple_id===couple?.id)||{});
}
function applyPersonalNav(){
  const nav=$("advancedNavModules");
  if(!nav)return;
  const prefs=currentPersonalPreferences();
  const items=new Map([...nav.querySelectorAll(".advTab")].map(b=>[b.getAttribute("onclick")?.match(/showAdvancedTab\('([^']+)'\)/)?.[1],b]));
  const ordered=prefs.module_order.map(k=>items.get(k)).filter(Boolean);
  if(ordered.some((b,i)=>nav.children[i]!==b))ordered.forEach(b=>nav.append(b));
  for(const [key,b] of items)b.hidden=prefs.hidden_modules.includes(key)&&advancedTab!==key;
}
function applyPersonalPreferences(){
  const prefs=currentPersonalPreferences();
  document.body.dataset.personalDensity=prefs.density;
  document.body.dataset.personalText=prefs.text_size;
  document.body.dataset.personalMotion=prefs.motion;
  applyPersonalNav();
}
function personalSection(key){return currentPersonalPreferences().home_sections.includes(key);}
function personalSectionAttr(key){return personalSection(key)?"":"hidden";}
function personalHomeBlock(key,html){return personalSection(key)?html:"";}
function personalHomeShortcuts(){
  const shortcuts=currentPersonalPreferences().shortcuts;
  return shortcuts.length?`<div class="advCard personalShortcuts"><div class="personalShortcutsHeading"><h3>⭐ Mis accesos rápidos</h3><button class="btn" onclick="openPersonalization()">Editar</button></div><div class="personalShortcutGrid">${shortcuts.map(k=>`<button class="bondGesture" data-module="${k}" onclick="showAdvancedTab(this.dataset.module)">${esc(personalModules[k])}</button>`).join("")}</div></div>`:"";
}
function openAllModules(){
  const prefs=currentPersonalPreferences();
  openAdvModal("Todos los módulos",`<p class="advMeta">Puedes abrir cualquier módulo, aunque lo hayas ocultado de la barra.</p><div class="personalShortcutGrid">${prefs.module_order.map(k=>`<button class="btn" data-module="${k}" onclick="closeAdvModal();showAdvancedTab(this.dataset.module)">${esc(personalModules[k])}</button>`).join("")}</div><div class="settingsActions"><button class="btn primary" onclick="openPersonalization()">Personalizar mi navegación</button></div>`);
}
function renderPersonalizationCard(){
  return `<div class="settingsCard"><h3>✨ Personalización avanzada</h3><p>Tu organización de módulos, accesos rápidos, tamaño de texto y vista de Inicio se guardan en tu cuenta. Los temas y las fotos siguen siendo compartidos.</p><div class="settingsActions"><button class="btn primary" onclick="openPersonalization()">Personalizar mi app</button><button class="btn" onclick="openAllModules()">Todos los módulos</button></div></div><div class="settingsCard"><h3>💞 Nuestra portada</h3><p>Una frase y un título para los dos, sobre su foto de Inicio.</p><button class="btn primary" onclick="openSharedCover()">Editar portada compartida</button></div>`;
}
function openPersonalization(reset=false){
  personalDraft=reset?normalizePersonalPreferences():currentPersonalPreferences();
  openAdvModal("Personalizar mi app ✨",`<p class="advMeta">Solo modifica tu cuenta. Inicio, Calendario y Configuración siempre estarán disponibles; los demás se pueden ocultar sin borrar datos.</p>
  <div class="personalSettingsForm"><h3>Lectura y apariencia</h3>${select("personal_density","Espaciado",[["comfortable","Cómodo"],["compact","Compacto"]])}${select("personal_text","Tamaño de texto",[["normal","Normal"],["large","Grande"]])}${select("personal_motion","Animaciones",[["system","Según el dispositivo"],["reduced","Reducidas"]])}
  <h3>Mi pantalla de Inicio</h3><div class="personalCheckList">${Object.entries(personalSections).map(([k,label])=>`<label><input type="checkbox" data-section="${k}" ${personalDraft.home_sections.includes(k)?"checked":""} onchange="changePersonalSection(this)"> ${esc(label)}</label>`).join("")}</div>
  <h3>Orden de los módulos</h3><p class="advMeta">Usa las flechas para ordenar. Marca ⭐ para tener hasta seis accesos rápidos en Inicio.</p><div id="personalModuleList"></div>
  <div class="settingsActions"><button class="btn" onclick="openPersonalization(true)">Restablecer valores</button><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" onclick="savePersonalization()">Guardar mis preferencias</button></div></div>`);
  $("adv_personal_density").value=personalDraft.density;$("adv_personal_text").value=personalDraft.text_size;$("adv_personal_motion").value=personalDraft.motion;
  renderPersonalModuleList();
}
function renderPersonalModuleList(){
  if(!personalDraft||!$("personalModuleList"))return;
  $("personalModuleList").innerHTML=personalDraft.module_order.map((k,i)=>`<div class="personalModuleRow"><strong>${esc(personalModules[k])}</strong><div class="personalModuleControls"><label><input type="checkbox" data-module="${k}" ${personalDraft.hidden_modules.includes(k)?"":"checked"} ${personalRequired.has(k)?"disabled":""} onchange="changePersonalVisibility(this)"> Mostrar</label><label><input type="checkbox" data-module="${k}" ${personalDraft.shortcuts.includes(k)?"checked":""} ${["home","settings"].includes(k)?"disabled":""} onchange="changePersonalShortcut(this)"> ⭐</label><button class="btn" type="button" data-module="${k}" onclick="movePersonalModule(this.dataset.module,-1)" ${i===0?"disabled":""} aria-label="Subir ${esc(personalModules[k])}">↑</button><button class="btn" type="button" data-module="${k}" onclick="movePersonalModule(this.dataset.module,1)" ${i===personalDraft.module_order.length-1?"disabled":""} aria-label="Bajar ${esc(personalModules[k])}">↓</button></div></div>`).join("");
}
function movePersonalModule(k,delta){
  if(!personalDraft)return;
  const order=personalDraft.module_order,i=order.indexOf(k),j=i+delta;
  if(i<0||j<0||j>=order.length)return;
  [order[i],order[j]]=[order[j],order[i]];renderPersonalModuleList();
}
function changePersonalVisibility(el){
  const k=el.dataset.module;
  if(!personalDraft||!Object.hasOwn(personalModules,k)||personalRequired.has(k))return;
  personalDraft.hidden_modules=personalDraft.hidden_modules.filter(x=>x!==k);
  if(!el.checked)personalDraft.hidden_modules.push(k);
}
function changePersonalShortcut(el){
  const k=el.dataset.module;
  if(!personalDraft||!Object.hasOwn(personalModules,k))return;
  personalDraft.shortcuts=personalDraft.shortcuts.filter(x=>x!==k);
  if(el.checked){if(personalDraft.shortcuts.length>=6){el.checked=false;showAppToast("Puedes elegir hasta seis accesos rápidos.","error");return;}personalDraft.shortcuts.push(k);}
}
function changePersonalSection(el){
  const k=el.dataset.section;if(!personalDraft||!Object.hasOwn(personalSections,k))return;
  personalDraft.home_sections=personalDraft.home_sections.filter(x=>x!==k);
  if(el.checked)personalDraft.home_sections.push(k);
}
async function savePersonalization(){
  if(!personalDraft||personalBusy||!user||!couple)return;
  personalBusy=true;const account=user.id,space=couple.id;
  const draft=normalizePersonalPreferences({...personalDraft,density:$("adv_personal_density").value,text_size:$("adv_personal_text").value,motion:$("adv_personal_motion").value});
  try {
    const {data,error}=await sb.from("couple_personalization").upsert({...draft,couple_id:space,user_id:account},{onConflict:"couple_id,user_id"}).select().single();
    if(error)throw error;
    if(user?.id!==account||couple?.id!==space)return;
    advCache.personalPrefs=[data];personalDraft=null;applyPersonalPreferences();closeAdvModal();renderAdvanced();
    showAppToast("Tus preferencias quedaron guardadas. ❤️");
  }catch(error){appAlert("No pudimos guardar tus preferencias. "+(error.message||""));}
  finally{personalBusy=false;}
}
const defaultCoverTitle="Este es nuestro lugar.\nEsta es nuestra historia.";
const defaultCoverSubtitle="Un pequeño rincón solo para nosotros: nuestros planes, recuerdos, sueños, cartas y todo lo que todavía nos falta vivir.";
function homeCoverTitle(){return esc(coupleSettings.home_title||defaultCoverTitle).replaceAll("\n","<br>");}
function homeCoverSubtitle(){return esc(coupleSettings.home_subtitle||defaultCoverSubtitle);}
function openSharedCover(){
  openAdvModal("Portada compartida 💞",formShell('<p class="advMeta">Los dos verán el mismo título y frase. Deja un campo vacío para volver a la frase original.</p>'+textarea("cover_title","Título","Nuestro lugar…")+textarea("cover_subtitle","Frase","Nuestro calendario, nuestros planes, nuestro futuro."),"saveSharedCover()"));
  $("adv_cover_title").value=coupleSettings.home_title||defaultCoverTitle;$("adv_cover_title").maxLength=100;
  $("adv_cover_subtitle").value=coupleSettings.home_subtitle||defaultCoverSubtitle;$("adv_cover_subtitle").maxLength=240;
}
async function saveSharedCover(){
  if(personalBusy||!user||!couple)return;
  const title=$("adv_cover_title").value.trim(),subtitle=$("adv_cover_subtitle").value.trim();
  if(title.length>100||subtitle.length>240)return appAlert("Revisa la longitud de la portada.");
  personalBusy=true;
  try{if(await saveCoupleSettings({home_title:title||null,home_subtitle:subtitle||null})){closeAdvModal();renderAdvanced();showAppToast("Portada guardada para los dos. ❤️");}}
  finally{personalBusy=false;}
}
