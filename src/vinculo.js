const connectionGestures = {
  heart: ["❤️", "Un corazón", "Te envío todo mi amor"],
  hug: ["🫂", "Un abrazo", "Aunque estemos lejos"],
  thinking: ["💭", "Pienso en ti", "Estás en mi mente"],
  compliment: ["💌", "Un cumplido", "Algo bonito para ti"],
};
const connectionMoods = {
  happy: ["😊", "Feliz"],
  calm: ["😌", "En calma"],
  tired: ["😴", "Con cansancio"],
  sad: ["🥺", "Triste"],
  stressed: ["😮‍💨", "Con estrés"],
  love: ["🥰", "Con mucho amor"],
};
let connectionSending = false;
let connectionAnimatedId = null;

function renderAdvVinculo() {
  const rows = advCache.connection || [];
  const ownMood = rows.find(x => x.kind === "mood" && x.sender_user_id === user?.id);
  const partnerMood = rows.find(x => x.kind === "mood" && x.sender_user_id !== user?.id);
  const gestures = rows.filter(x => x.kind !== "mood" && connectionGestures[x.kind]);
  const received = gestures.find(x => x.sender_user_id !== user?.id);
  const animate = received && received.id !== connectionAnimatedId;
  if (received) connectionAnimatedId = received.id;
  const moodCard = (label, row) => {
    const mood = connectionMoods[row?.body];
    return `<div class="bondMoodStatus"><small>${label}</small><strong>${mood ? mood.join(" ") : "Sin compartir aún"}</strong>${row ? `<small>${esc(new Date(row.created_at).toLocaleString("es-CO", { timeZone: "America/Bogota" }))}</small>` : ""}</div>`;
  };
  return `<section class="bond">
    <div class="bondHero"><div class="bondHeroHeart">💞</div><small>NUESTRO ESPACIO</small><h2>Nuestro vínculo</h2><p>Los pequeños detalles también hacen grande nuestro amor.</p></div>
    <div class="advCard"><h3>Envíale un poquito de amor</h3><p>Un gesto pequeño puede cambiarle el día.</p><div class="bondGestures">${Object.entries(connectionGestures).filter(([k]) => k !== "compliment").map(([k, g]) => `<button type="button" class="bondGesture" onclick="sendConnection('${k}')"><span>${g[0]}</span><strong>${g[1]}</strong><small>${g[2]}</small></button>`).join("")}</div><div id="bondFeedback" role="status" aria-live="polite"></div></div>
    ${renderKnowing()}
    <div class="advCard"><h3>¿Cómo estamos hoy?</h3><div class="bondMoodPair">${moodCard("Tú", ownMood)}${moodCard("Tu pareja", partnerMood)}</div><p>Comparte cómo te sientes.</p><div class="bondMoods">${Object.entries(connectionMoods).map(([k, m]) => `<button type="button" class="bondMood ${ownMood?.body === k ? "selected" : ""}" aria-pressed="${ownMood?.body === k}" onclick="sendConnection('mood','${k}')"><span>${m[0]}</span>${m[1]}</button>`).join("")}</div></div>
    <div class="advCard"><h3>💌 Buzón de cumplidos</h3><p>¿Qué te encanta de tu pareja hoy?</p><textarea id="bondCompliment" maxlength="500" rows="3" placeholder="Hoy quiero decirte que…"></textarea><button type="button" class="btn primary" onclick="sendConnection('compliment')">Enviar cumplido 💌</button></div>
    <div class="advCard"><h3>Nuestros pequeños detalles</h3><div class="bondHistory">${gestures.slice(0, 60).map(x => {
      const g = connectionGestures[x.kind];
      const mine = x.sender_user_id === user?.id;
      return `<article class="bondEvent ${animate && x.id === received.id ? "bondArrival" : ""}" data-advanced-id="${esc(x.id)}"><span class="bondEventIcon">${g[0]}</span><div><strong>${mine ? "Enviaste" : "Recibiste"} · ${g[1]}</strong>${x.kind === "compliment" ? `<p>${esc(x.body)}</p>` : ""}<small>${esc(new Date(x.created_at).toLocaleString("es-CO", {timeZone: "America/Bogota"}))}</small></div></article>`;
    }).join("") || '<div class="advEmpty">Aquí comenzará su historia de pequeños detalles. ❤️</div>'}</div></div>
  </section>`;
}

async function sendConnection(kind, mood) {
  if (connectionSending || !user || !couple) return;
  const account = user.id, space = couple.id;
  const input = $("bondCompliment");
  const body = kind === "compliment" ? input?.value.trim() : kind === "mood" ? mood : null;
  if (kind === "compliment" && (!body || body.length > 500)) {
    showAppToast("Escribe un cumplido de hasta 500 caracteres.", "error");
    return;
  }
  if (kind === "mood" ? !connectionMoods[mood] : !connectionGestures[kind]) return;
  connectionSending = true;
  try {
    const { data, error } = await sb.from("couple_connection").insert({
      couple_id: space, sender_user_id: account, kind, body,
    }).select().single();
    if (error) throw error;
    if (user?.id !== account || couple?.id !== space) return;
    advCache.connection = [data, ...advCache.connection.filter(x => x.id !== data.id)];
    if (kind === "compliment" && input) input.value = "";
    if (advancedTab === "vinculo") {
      renderAdvanced({ preserveInputs: true });
      const feedback = $("bondFeedback");
      if (feedback) {
        feedback.classList.add("bondSent");
        feedback.textContent = kind === "mood" ? "💗 Estado compartido" : connectionGestures[kind][0] + " ¡Enviado con amor!";
      }
    }
    await createPartnerNotification({
      event_type: "connection_" + kind,
      title: kind === "mood" ? "💞 Tu pareja compartió cómo se siente" : connectionGestures[kind][0] + " Tienes un detalle de tu pareja",
      body: "Abre Nuestro vínculo para descubrirlo.",
      target_tab: "vinculo",
      target_id: kind === "mood" ? null : data.id,
    });
  } catch (error) {
    console.warn("No se pudo compartir el detalle:", error.message);
    showAppToast("No pudimos compartirlo. Inténtalo nuevamente.", "error");
  } finally {
    connectionSending = false;
  }
}
