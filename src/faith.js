const faithKinds={prayer:["🙏","Petición de oración"],gratitude:["🌿","Gratitud"],reflection:["📖","Reflexión"]};
let faithBusy=false;
function faithReading(day=countdownToday()) {
  const n=Math.floor(Date.parse(day+"T00:00:00Z")/86400000);
  // Preserve the passage associated with a previously registered daily reading.
  const firstExpandedDay=Math.floor(Date.parse("2026-11-27T00:00:00Z")/86400000);
  const index=n<firstExpandedDay?((n%21)+21)%21:(n-firstExpandedDay+21)%faithReadings.length;
  return faithReadings[index];
}
function renderFaithStudy(reading) {
  const [reference,title,meditation,prompt,practice,prayer]=reading;
  return `<div class="faithStudy"><h3>${esc(reference)}</h3><strong class="faithTitle">${esc(title)}</strong>
    <small class="advMeta">Lee primero el pasaje completo en tu Biblia. Esta es una meditación original inspirada en la lectura.</small>
    <div class="faithTeaching"><h4>📖 Enseñanza para los dos</h4>${meditation.split("\n").map(p=>`<p>${esc(p)}</p>`).join("")}</div>
    <div class="faithPrompt"><strong>💬 Conversemos juntos</strong><p>${esc(prompt)}</p></div>
    <div class="faithPrompt"><strong>🤝 Pongámoslo en práctica</strong><p>${esc(practice)}</p></div>
    <div class="faithPrompt faithPrayer"><strong>🙏 Oremos juntos</strong><p>${esc(prayer)}</p></div></div>`;
}
function openFaithLibrary() {
  const groups=[["Fundamentos del amor y la fe",0,21],["Preparación y compromisos",21,42],["Vida en pareja y futuro hogar",42,63]];
  openAdvModal("Biblioteca de devocionales 📖",`<p class="advMeta">${faithReadings.length} enseñanzas para leer a su ritmo. Explorar no cambia el registro del devocional del día.</p><div class="faithLibrary">${groups.map(([name,start,end])=>`<section><h3>${name}</h3>${faithReadings.slice(start,end).map((r,i)=>`<button type="button" class="faithLibraryItem" onclick="openFaithStudy(${start+i})"><strong>${esc(r[1])}</strong><small>${esc(r[0])} · Leer ↗</small></button>`).join("")}</section>`).join("")}</div>`);
}
function openFaithStudy(index) {
  if(!Number.isInteger(index)||!faithReadings[index])return;
  openAdvModal("Devocional en pareja 📖",`<button class="btn" onclick="openFaithLibrary()">← Volver a la biblioteca</button>${renderFaithStudy(faithReadings[index])}`);
}
function openFaithPast(day) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!faithReading(day))return;
  openAdvModal("Devocional del "+dateES(day),renderFaithStudy(faithReading(day)));
}
function faithRow(id) { return advCache.faith.find(x=>x.id===id); }
function faithAction(label,action,id,primary=false) {
  return `<button class="btn ${primary?"primary":""}" data-faith="${esc(id)}" onclick="${action}(this.dataset.faith)">${label}</button>`;
}
function renderAdvFaith() {
  const day=countdownToday(), reading=faithReading(day);
  const rows=advCache.faith||[], daily=rows.filter(x=>x.kind==="devotional"&&x.entry_date===day);
  const mine=daily.some(x=>x.created_by===user?.id), partner=daily.some(x=>x.created_by!==user?.id);
  const prayers=rows.filter(x=>x.kind==="prayer"), answered=prayers.filter(x=>x.answered).length;
  const card=x=>{
    const own=x.created_by===user?.id, support=rows.filter(s=>s.kind==="support"&&s.parent_id===x.id);
    const prayed=support.some(s=>s.created_by===user?.id&&s.entry_date===day);
    return `<article class="adventureCard" data-advanced-id="${esc(x.id)}">
      <div class="adventureCardTop"><span class="adventureIcon">${faithKinds[x.kind][0]}</span><div><strong>${esc(x.title)}</strong><small>${own?"De ti":"De tu pareja"} · ${esc(dateES(x.entry_date))}</small></div>${x.kind==="prayer"?`<span class="adventureBadge">${x.answered?"Respondida ✨":"En oración"}</span>`:""}</div>
      <p>${esc(x.body)}</p>
      ${x.kind==="prayer"?`<small>🙏 ${support.length} acompañamientos en oración</small>`:""}
      <div class="adventureActions">${x.kind==="prayer"&&!x.answered?(prayed?'<span class="advMeta">✓ Ya oraste hoy</span>':faithAction("Oré por esto 🙏","prayFaith",x.id,true)):""}
      ${own&&x.kind==="prayer"?faithAction(x.answered?"Reabrir petición":"Marcar respondida ✨","answerFaith",x.id):""}
      ${own?faithAction("Editar","editFaith",x.id)+faithAction("Eliminar","deleteFaith",x.id):""}</div></article>`;
  };
  return `<section class="bond faithModule" id="faithToday" data-date="${esc(day)}">
    <div class="bondHero"><div class="bondHeroHeart">✝️</div><small>DIOS EN EL CENTRO</small><h2>Nuestra fe</h2><p>Crecer en amor, esperanza y propósito, tomados de la mano de Dios.</p></div>
    <div class="adventureStats"><div><strong>${prayers.length-answered}</strong><span>en oración</span></div><div><strong>${answered}</strong><span>oraciones respondidas</span></div><div><strong>${daily.length}/2</strong><span>devocional de hoy</span></div></div>
    <div class="advCard faithReading"><div class="faithReadingTop"><div class="advMeta">📖 LECTURA DEL DÍA · ${esc(dateES(day))}</div><button class="btn" onclick="openFaithLibrary()">📚 Biblioteca · ${faithReadings.length}</button></div>${renderFaithStudy(reading)}<div class="faithPair"><span>${mine?"✓":"○"} Tú</span><span>${partner?"✓":"○"} Tu pareja</span></div><div class="adventureActions"><button class="btn primary" onclick="markFaithDevotional()" ${mine?"disabled":""}>${mine?"Devocional realizado ✓":"Marcar lectura realizada"}</button><button class="btn" onclick="openFaithForm('reflection',null,true)">Escribir reflexión</button><button class="btn" onclick="scheduleFaith()">Agendar oración juntos</button></div></div>
    <div class="adventureCreate"><button class="bondGesture" onclick="openFaithForm('prayer')"><span>🙏</span><strong>Petición</strong><small>Oremos juntos</small></button><button class="bondGesture" onclick="openFaithForm('gratitude')"><span>🌿</span><strong>Dar gracias</strong><small>Recordemos sus bendiciones</small></button><button class="bondGesture" onclick="openFaithForm('reflection')"><span>📖</span><strong>Reflexión</strong><small>Diario compartido</small></button></div>
    <div class="advCard"><h3>🙏 Nuestro altar de oración</h3><p class="advMeta">Pidan, acompañen y recuerden las respuestas con gratitud.</p><div class="adventureList">${prayers.filter(x=>!x.answered).map(card).join("")||'<div class="advEmpty">Compartan una petición para comenzar.</div>'}</div></div>
    <div class="advCard"><h3>✨ Oraciones respondidas</h3><div class="adventureList">${prayers.filter(x=>x.answered).map(card).join("")||'<div class="advEmpty">Aquí quedarán los testimonios de su camino.</div>'}</div></div>
    <div class="advCard"><h3>🌿 Diario de gratitud y reflexiones</h3><div class="adventureList">${rows.filter(x=>["gratitude","reflection"].includes(x.kind)).map(card).join("")||'<div class="advEmpty">Guarden lo que Dios está enseñándoles.</div>'}</div></div>
    <div class="advCard"><h3>🗓️ Nuestro camino devocional</h3><div class="adventureList">${[...new Set(rows.filter(x=>x.kind==="devotional").map(x=>x.entry_date))].sort().reverse().slice(0,30).map(d=>`<div class="adventureCard"><strong>${esc(dateES(d))}</strong> · ${esc(faithReading(d)[0])}<p>${rows.filter(x=>x.kind==="devotional"&&x.entry_date===d).length}/2 lecturas realizadas</p><button class="btn" data-day="${esc(d)}" onclick="openFaithPast(this.dataset.day)">Releer devocional</button></div>`).join("")||'<div class="advEmpty">Cada día es una oportunidad para acercarse a Dios.</div>'}</div></div>
  </section>`;
}
function openFaithForm(kind,id=null,daily=false) {
  if(!faithKinds[kind]) return;
  const current=id?faithRow(id):null;
  openAdvModal(faithKinds[kind].join(" "),formShell('<p class="advMeta">Lo que escribas será visible únicamente en su espacio compartido.</p>'+input("faith_title","Título","text",'maxlength="120"')+textarea("faith_body","Contenido","Comparte lo que llevas en el corazón…"),`saveFaithEntry('${kind}','${id||""}')`));
  $("adv_faith_title").value=current?.title||(daily?faithReading()[0]:"");
  $("adv_faith_body").value=current?.body||"";
  $("adv_faith_body").maxLength=2000;
}
function editFaith(id) { const row=faithRow(id); if(row?.created_by===user?.id) openFaithForm(row.kind,id); }
async function faithMutation(work,message,notice,targetId=null) {
  if(faithBusy||!user||!couple) return;
  faithBusy=true; const account=user.id,space=couple.id;
  try {
    const {data,error}=await work(space,account);
    if(error) { if(error.code==="23505") { await advLoadAll(["faith"]); showAppToast("Ya registraste esta acción hoy. 🙏"); return; } throw error; }
    if(user?.id!==account||couple?.id!==space) return;
    await advLoadAll(["faith"]);
    showAppToast(message);
    if(notice) await createPartnerNotification({event_type:"faith_updated",title:"🙏 Novedad en Nuestra fe",body:notice,target_tab:"fe",target_id:targetId===false?null:targetId||data?.id||null});
    return true;
  } catch(error) { showAppToast("No se pudo guardar. Vuelve a intentarlo.", "error"); return false; }
  finally { faithBusy=false; }
}
async function saveFaithEntry(kind,id) {
  const title=$("adv_faith_title").value.trim(), body=$("adv_faith_body").value.trim();
  if(!faithKinds[kind]||!title||title.length>120||body.length>2000) return appAlert("Completa el título y revisa la longitud del contenido.");
  const ok=await faithMutation((space,account)=>id?sb.from("couple_faith").update({title,body}).eq("id",id).eq("couple_id",space).select("id").single():sb.from("couple_faith").insert({couple_id:space,created_by:account,kind,title,body}).select("id").single(),"Guardado con amor. 🙏","Tu pareja compartió algo en su espacio de fe.",id||null);
  if(ok) closeAdvModal();
}
function markFaithDevotional() {
  return faithMutation((space,account)=>sb.from("couple_faith").insert({couple_id:space,created_by:account,kind:"devotional"}).select("id").single(),"Lectura registrada. 📖","Tu pareja completó la lectura de hoy.",false);
}
function prayFaith(id) {
  return faithMutation((space,account)=>sb.from("couple_faith").insert({couple_id:space,created_by:account,kind:"support",parent_id:id}).select("id").single(),"Oración registrada. 🙏","Tu pareja te acompaña en oración.",id);
}
function answerFaith(id) {
  const row=faithRow(id); if(!row||row.created_by!==user?.id) return;
  return faithMutation(space=>sb.from("couple_faith").update({answered:!row.answered}).eq("id",id).eq("couple_id",space).select("id").single(),"Petición actualizada. 🙏","Hay una novedad en sus peticiones.",id);
}
async function deleteFaith(id) {
  const row=faithRow(id); if(!row||row.created_by!==user?.id) return;
  if(!await appConfirm("¿Eliminar esta entrada de su diario compartido?","Eliminar entrada",true)) return;
  return faithMutation(space=>sb.from("couple_faith").delete().eq("id",id).eq("couple_id",space).select("id").single(),"Entrada eliminada.",null);
}
function scheduleFaith() {
  showAdvancedTab("calendar"); openModal(countdownToday());
  $("title").value="Orar y leer la Biblia juntos";
  $("cat").value="iglesia";
  $("noteInput").value="Reservemos este tiempo para Dios y nuestra relación.";
}
