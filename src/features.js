function formatDate(date) {
  if (!date) return "";

  return new Date(date + "T12:00:00").toLocaleDateString(
    "es-CO",

    {
      weekday: "long",

      day: "numeric",

      month: "long",

      year: "numeric",
    },
  );
}

function parseDateOnly(s) {
  return new Date(s + "T00:00:00");
}

function addDaysDate(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function getImportantDateOccurrencesForRange(startKey, endKey) {
  const start = parseDateOnly(startKey),
    end = parseDateOnly(endKey),
    out = [];
  for (const item of advCache.dates || []) {
    if (!item.event_date) continue;
    const base = parseDateOnly(item.event_date);
    const type = item.recurrence_type || (item.recurring ? "yearly" : "none");
    const interval = Math.max(1, Number(item.recurrence_interval || 1));
    if (type === "none") {
      if (item.event_date >= startKey && item.event_date <= endKey)
        out.push({
          source: "date",
          id: item.id,
          date: item.event_date,
          title: item.title,
          icon: "📅",
          category: item.category,
        });
    } else if (type === "monthly") {
      let months =
        (start.getFullYear() - base.getFullYear()) * 12 +
        start.getMonth() -
        base.getMonth();
      let step = Math.max(0, Math.floor(months / interval) * interval);
      let d = addMonthsSafe(base, step);
      if (d < start) d = addMonthsSafe(base, (step += interval));
      for (; d <= end; d = addMonthsSafe(base, (step += interval))) {
        if (d >= base)
          out.push({
            source: "date",
            id: item.id,
            date: dateKeyLocal(d),
            title: item.title,
            icon: "📅",
            category: item.category,
          });
      }
    } else if (type === "yearly") {
      let y = Math.max(base.getFullYear(), start.getFullYear());
      while ((y - base.getFullYear()) % interval !== 0) y++;
      for (; y <= end.getFullYear(); y += interval) {
        const d = new Date(y, base.getMonth(), base.getDate());
        if (d >= start && d <= end && d >= base)
          out.push({
            source: "date",
            id: item.id,
            date: dateKeyLocal(d),
            title: item.title,
            icon: "📅",
            category: item.category,
          });
      }
    }
  }
  return out;
}

function renderAdvHome() {
  const p = plans.length,
    m = advCache.memories.length,
    d = advCache.dreams.filter((x) => x.status === "cumplido").length,
    g = advCache.goals.length,
    ch = advCache.challenges.filter((x) => x.completed).length;
  const next = getNextUpcomingPlan();
  const together = Math.max(
    0,
    Math.floor((Date.now() - new Date("2026-01-21T00:00:00")) / 86400000),
  );
  const dating = Math.max(
    0,
    Math.floor((Date.now() - new Date("2026-04-21T00:00:00")) / 86400000),
  );
  return `<div class="homeIntro"><div class="homeWelcome" style="position:relative;overflow:hidden"><img data-home-photo src="${esc(cachedHomePhotoUrl() || "pareja.jpeg")}" alt="Nuestra foto" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:1;z-index:0;${photoFrameStyle(coupleSettings,true)}"><div style="position:relative;z-index:1"><div class="homeWelcomeContent"><div class="homePill">❤️ Nuestro Calendario #21 · Ana María & Nicolás</div><h2>${homeCoverTitle()}</h2><p>${homeCoverSubtitle()}</p><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px"><button class="btn primary" onclick="showAdvancedTab('calendar')">🗓️ Entrar al calendario</button><button class="btn homeQuickCreateBtn" onclick="openQuickCreate()">✨ Crear algo especial</button></div></div></div></div></div>${personalHomeShortcuts()}<div class="homeStats" ${personalSectionAttr("stats")}><div class="homeStat"><strong>${together}</strong><span>días juntos ❤️</span></div><div class="homeStat"><strong>${dating}</strong><span>días de novios 💍</span></div><div class="homeStat"><strong>${p}</strong><span>planes guardados 🗓️</span></div><div class="homeStat"><strong>${m}</strong><span>recuerdos 📸</span></div></div><div class="homeNext" ${personalSectionAttr("next")}><div class="homeNextIcon">${next ? categoryIcon(next.category) : "♡"}</div><div style="flex:1"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#a16a7d;font-weight:900">Próximo capítulo</div><div class="homeNextTitle">${next ? esc(next.title) : "Todavía no hay un próximo plan"}</div><div class="homeNextMeta">${next ? dateES(next._occurrenceDate) + (next.plan_time ? " · " + formatTime(next.plan_time) : "") : "Creen uno y hagan que aparezca aquí ❤️"}</div>${next && next.recurrence_enabled ? '<span class="seriesBadge">🔁 Plan recurrente</span>' : ""}</div>${next ? '<button class="btn" data-next-id="' + next.id + '" data-date="' + next._occurrenceDate + '" onclick="openPlanDetail(this.dataset.nextId,this.dataset.date)">Abrir</button>' : ""}</div>${personalHomeBlock("recap",monthlyRecapCard())}${personalHomeBlock("countdown",homeCountdownCard())}<section class="homeNext" ${personalSectionAttr("week")}><div><h3>Próximos siete días</h3><p class="advMeta">Planes, fechas especiales y tareas asignadas.</p></div><button class="btn" type="button" onclick="openWeeklySummary()">Ver semana</button></section>${personalHomeBlock("question",dailyQuestionHomeCard())}<div class="advGrid" ${personalSectionAttr("summary")}><div class="advCard"><h3>✨ Sueños cumplidos</h3><div class="advMetric">${d}</div><p>De ideas bonitas a cosas que realmente vivieron.</p></div><div class="advCard"><h3>💌 Cartas</h3><div class="advMetric">${advCache.letters.length}</div><p>Palabras para leer hoy o guardar para el futuro.</p></div><div class="advCard"><h3>🎯 Retos</h3><div class="advMetric">${ch}</div><p>Pequeños desafíos para hacer juntos.</p></div><div class="advCard"><h3>💰 Metas</h3><div class="advMetric">${g}</div><p>Lo que están construyendo paso a paso.</p></div></div>`;
}

function renderAdvDreams() {
  return (
    advHeader(
      "Nuestra lista de sueños",
      "Todo lo que quieren vivir, conocer y conseguir juntos.",
      "✨ Nuevo sueño",
      "openDreamForm()",
    ) +
    `<div class="advList">${advCache.dreams.length ? advCache.dreams.map((x) => `<div class="advItem" data-advanced-id="${x.id}"><div style="flex:1"><div class="advItemTitle">${x.status === "cumplido" ? "✅ " : x.status === "planeando" ? "🟡 " : "✨ "}${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.target_date ? " · " + dateES(x.target_date) : ""}${x.budget ? " · " + money(x.budget) : ""}</div><p>${esc(x.description || "")}</p>${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? `<div class="advMeta">📍 Lugar: ${placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name)}</div>` : ""}${dreamSavingsCard(x)}</div><div class="advActions"><select class="btn" onchange="setDreamStatus('${x.id}',this.value)"><option value="pendiente" ${x.status === "pendiente" ? "selected" : ""}>Pendiente</option><option value="planeando" ${x.status === "planeando" ? "selected" : ""}>Planeando</option><option value="cumplido" ${x.status === "cumplido" ? "selected" : ""}>Cumplido</option></select><button class="btn" onclick="openAdvancedEdit('dreams','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('dreams','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">✨ ¿Qué quieren hacer algún día? Empiecen su lista.</div>`}</div>`
  );
}

function renderAdvChallenges() {
  return (
    advHeader(
      "Retos de pareja",
      "Pequeños desafíos para convertir días normales en recuerdos.",
      "🎯 Nuevo reto",
      "openChallengeForm()",
    ) +
    `<div class="advList">${advCache.challenges.length ? advCache.challenges.map((x) => `<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">${x.completed ? "🏆 " : "🎯 "}${esc(x.title)}</div><div class="advMeta">${x.start_date ? dateES(x.start_date) : ""}${x.end_date ? " → " + dateES(x.end_date) : ""} · ${x.points} puntos${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""}</div><p>${esc(x.description || "")}</p></div><div class="advActions"><button class="btn" onclick="toggleChallenge('${x.id}',${!x.completed})">${x.completed ? "↩️ Reabrir" : "✓ Completar"}</button><button class="btn" onclick="openAdvancedEdit('challenges','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('challenges','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">🎯 Creen un reto para este mes: una cita diferente, una foto, cocinar juntos...</div>`}</div>`
  );
}

function renderAdvIdeas() {
  return (
    advHeader(
      "¿Qué hacemos hoy?",
      "Pulsen el botón y dejen que el azar elija una idea.",
      "🎲 Sorpréndenos",
      "randomIdea()",
    ) +
    `<div id="randomIdeaBox" class="advCard" style="margin-top:18px;text-align:center"><h3>🎲 ¿Qué hacemos hoy?</h3><p>La próxima actividad puede estar a un clic.</p></div><div class="advList">${advCache.ideas.length ? advCache.ideas.map((x) => `<div class="advItem"><div><div class="advItemTitle">🎲 ${esc(x.title)}</div><div class="advMeta">${esc(x.category)}${x.estimated_budget ? " · " + money(x.estimated_budget) : ""}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""}</div><p>${esc(x.description || "")}</p></div><div class="advActions"><button class="btn primary" onclick="scheduleIdea('${x.id}')">🗓️ Agendar</button><button class="btn" onclick="openAdvancedEdit('ideas','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('ideas','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">Agreguen sus propias ideas para tener un botón de “sorpréndenos” realmente de ustedes.</div>`}</div>`
  );
}

function renderAdvDates() {
  return (
    advHeader(
      "Fechas importantes",
      "Aniversarios, cumpleaños y días que no quieren olvidar.",
      "📅 Nueva fecha",
      "openDateForm()",
    ) +
    `<div class="advList">${advCache.dates.length ? advCache.dates.map((x) => `<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">📅 ${esc(x.title)}</div><div class="advMeta">${dateES(x.event_date)} · ${esc(x.category)}${x.place_id && advCache.places.find((p) => p.id === x.place_id) ? " · 📍 " + placeLinkHtml(x.place_id, advCache.places.find((p) => p.id === x.place_id).name) : ""}${x.recurrence_type === "monthly" ? " · 🔁 Cada mes" : x.recurrence_type === "yearly" || x.recurring ? " · 🔁 Cada año" : ""}</div><p>${esc(x.description || "")}</p></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('dates','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('dates','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">📅 Guarden aquí las fechas que hacen especial su historia.</div>`}</div>`
  );
}

function renderAdvPlaces() {
  return (
    advHeader(
      "Nuestros lugares",
      "Los puntos del mapa que guardan una historia.",
      "📍 Nuevo lugar",
      "openPlaceForm()",
    ) +
    `<div class="advList">${advCache.places.length ? advCache.places.map((x) => `<div class="advItem" data-advanced-id="${x.id}"><div><div class="advItemTitle">📍 ${esc(x.name)}</div><div class="advMeta">${esc(x.category)}${x.visit_date ? " · " + dateES(x.visit_date) : ""}${x.address ? " · " + esc(x.address) : ""}</div><p>${esc(x.description || "")}</p>${x.latitude && x.longitude ? `<a class="btn" style="display:inline-block;text-decoration:none" target="_blank" href="https://www.google.com/maps/search/?api=1&query=${x.latitude},${x.longitude}">🗺️ Abrir mapa</a>` : ""}</div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('places','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('places','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">📍 Guarden aquí los lugares que algún día querrán volver a visitar.</div>`}</div>`
  );
}

function renderAdvAchievements() {
  const daysTogether = Math.max(
    0,
    Math.floor((Date.now() - new Date("2026-01-21T00:00:00")) / 86400000),
  );
  const plansCount = plans.length,
    memoriesCount = advCache.memories.length,
    lettersCount = advCache.letters.length,
    dreamsCount = advCache.dreams.length,
    datesCount = advCache.dates.length,
    goalsCount = advCache.goals.length,
    placesCount = advCache.places.length;
  const milestones = [
    ...gameAchievementList(),
    ["❤️", "Empezó nuestra historia", true, "El comienzo de todo."],
    ["💍", "Nos hicimos novios", true, "El día que eligieron caminar juntos."],
    ["🌱", "Primer plan juntos", plansCount >= 1, "Su primera cita guardada."],
    ["🗓️", "5 planes", plansCount >= 5, "Cinco momentos planeados."],
    ["🌿", "10 planes", plansCount >= 10, "Diez planes para seguir viviendo."],
    ["🌳", "25 planes", plansCount >= 25, "Una colección de aventuras."],
    [
      "📸",
      "Primer recuerdo",
      memoriesCount >= 1,
      "El primer momento guardado.",
    ],
    [
      "📸",
      "10 recuerdos",
      memoriesCount >= 10,
      "Diez recuerdos para volver a mirar.",
    ],
    [
      "💌",
      "Primera carta",
      lettersCount >= 1,
      "Una carta escrita desde el corazón.",
    ],
    ["💌", "5 cartas", lettersCount >= 5, "Cinco mensajes para el futuro."],
    [
      "✨",
      "Primer sueño cumplido",
      advCache.dreams.some((x) => x.status === "cumplido"),
      "Un sueño dejó de ser solo un sueño.",
    ],
    ["✨", "5 sueños", dreamsCount >= 5, "Cinco cosas que quieren vivir."],
    [
      "🎯",
      "Primer reto completado",
      advCache.challenges.some((x) => x.completed),
      "El primer desafío superado.",
    ],
    [
      "🎯",
      "5 retos completados",
      advCache.challenges.filter((x) => x.completed).length >= 5,
      "Cinco retos vencidos juntos.",
    ],
    [
      "📅",
      "Primera fecha importante",
      datesCount >= 1,
      "Una fecha que merece quedarse.",
    ],
    ["💰", "Primera meta", goalsCount >= 1, "El primer objetivo compartido."],
    [
      "💰",
      "Primera meta cumplida",
      advCache.goals.some((x) => x.completed),
      "Una meta alcanzada juntos.",
    ],
    [
      "📍",
      "Primer lugar guardado",
      placesCount > 0,
      "Un lugar que ahora forma parte de su historia.",
    ],
    [
      "🔥",
      "100 días juntos",
      daysTogether >= 100,
      "Más de cien días de historia.",
    ],
    [
      "💖",
      "200 días juntos",
      daysTogether >= 200,
      "Doscientos días construyendo recuerdos.",
    ],
    ["🏆", "365 días juntos", daysTogether >= 365, "Un año entero de ustedes."],
    [
      "💎",
      "500 días juntos",
      daysTogether >= 500,
      "Quinientos días de historia.",
    ],
    [
      "👑",
      "1000 días juntos",
      daysTogether >= 1000,
      "Una historia que ya tiene mil días.",
    ],
    [
      "🌙",
      "Plan recurrente",
      plans.some((x) => x.recurrence_enabled),
      "Crearon algo que vuelve una y otra vez.",
    ],
  ];
  return (
    advHeader(
      "Nuestros logros",
      "Pequeños hitos que muestran cuánto han construido.",
      "🎯 Ver retos",
      "showAdvancedTab('challenges')",
    ) +
    `<div class="achievementGrid">${milestones.map((x) => `<div class="achievementCard ${x[2] ? "unlocked" : "locked"}"><div class="achievementIcon">${x[2] ? x[0] : "🔒"}</div><h3>${esc(x[1])}</h3><p>${x[2] ? "Desbloqueado ❤️" : esc(x[3])}</p></div>`).join("")}</div>`
  );
}

function renderAdvPrivate() {
  return (
    advHeader(
      "Mi rincón privado",
      "Estas notas solo las puede ver la persona que las creó.",
      "🔐 Nueva nota",
      "openPrivateForm()",
    ) +
    `<div class="advList">${advCache.privateNotes.length ? advCache.privateNotes.map((x) => `<div class="advItem"><div><div class="advItemTitle">🔐 ${esc(x.title)}</div><p>${esc(x.content)}</p></div><div class="advActions"><button class="btn" onclick="openAdvancedEdit('privateNotes','${x.id}')">✏️ Editar</button><button class="btn danger" onclick="deleteAdvanced('privateNotes','${x.id}')">🗑️</button></div></div>`).join("") : `<div class="advEmpty">🔐 Un espacio solo para ti. La otra persona no puede leer estas notas.</div>`}</div>`
  );
}

function localISODate(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function formShell(fields, submit) {
  return `<div class="advForm">${fields}</div><div style="display:flex;justify-content:flex-end;gap:8px;margin-top:18px"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn primary" onclick="${submit}">Guardar ❤️</button></div>`;
}

function input(id, label, type = "text", extra = "") {
  return `<div class="field"><label>${label}</label><input id="adv_${id}" type="${type}" ${extra}></div>`;
}

function textarea(id, label, ph = "") {
  return `<div class="field"><label>${label}</label><textarea id="adv_${id}" placeholder="${ph}"></textarea></div>`;
}

function select(id, label, opts) {
  return `<div class="field"><label>${label}</label><select id="adv_${id}">${opts.map((o) => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select></div>`;
}

function openQuickCreate() {
  openAdvModal(
    "Crear algo nuevo ✨",
    `<p class="advMeta">Elige qué quieres agregar a nuestro espacio. Cada novedad compartida avisará a tu pareja. ❤️</p><div class="advGrid"><button class="btn primary" onclick="closeAdvModal();showAdvancedTab('calendar');setTimeout(()=>openModal(),80)">🗓️ Plan del calendario</button><button class="btn" onclick="closeAdvModal();openMemoryForm()">📸 Recuerdo</button><button class="btn" onclick="closeAdvModal();openLetterForm()">💌 Carta</button><button class="btn" onclick="closeAdvModal();openDreamForm()">✨ Sueño</button><button class="btn" onclick="closeAdvModal();openChallengeForm()">🎯 Reto</button><button class="btn" onclick="closeAdvModal();openDateForm()">📅 Fecha importante</button><button class="btn" onclick="closeAdvModal();openGoalForm()">💰 Meta</button><button class="btn" onclick="closeAdvModal();openPlaceForm()">📍 Lugar</button><button class="btn" onclick="closeAdvModal();openIdeaForm()">🎲 Idea para una cita</button><button class="btn" onclick="closeAdvModal();showAdvancedTab('budget');setTimeout(()=>openExpenseForm(),80)">💸 Ingreso o gasto</button><button class="btn" onclick="closeAdvModal();showAdvancedTab('budget');setTimeout(()=>openRecurringForm(),80)">🔁 Movimiento recurrente</button><button class="btn" onclick="closeAdvModal();showAdvancedTab('question')">💭 Responder pregunta del día</button></div>`,
  );
}

function openDreamForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nuevo sueño ✨",
    formShell(
      input("title", "Sueño") +
        select("category", "Categoría", [
          ["viaje", "Viaje"],
          ["hogar", "Hogar"],
          ["experiencia", "Experiencia"],
          ["personal", "Personal"],
          ["pareja", "Pareja"],
        ]) +
        textarea("description", "Descripción") +
        `<div class="advFormGrid">${input("target_date", "Fecha objetivo", "date")}${input("budget", "Presupuesto", "number", 'min="0"')}</div>`+dreamSavingsSelector(),
      `saveDream()`,
    ),
  );
}

async function saveDream() {
  if (advancedEditState.key === "dreams" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe el sueño ❤️");
  const { data: created, error } = await sb
    .from("dreams")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      description: $("adv_description").value,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      target_date: $("adv_target_date").value || null,
      budget: $("adv_budget").value || null,
      goal_id: $("adv_dream_goal")?.value || null,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "dream_created",
    title: "Nuevo sueño ✨",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó el sueño «" +
      title +
      "».",
    target_tab: "dreams",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

function openChallengeForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nuevo reto 🎯",
    formShell(
      input("title", "Nombre del reto") +
        textarea("description", "Descripción", "¿Qué tienen que hacer?") +
        `<div class="advFormGrid">${input("start_date", "Desde", "date")}${input("end_date", "Hasta", "date")}</div>` +
        input("points", "Puntos", "number", 'value="10" min="1"'),
      `saveChallenge()`,
    ),
  );
}

async function saveChallenge() {
  if (advancedEditState.key === "challenges" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe el nombre del reto");
  const { data: created, error } = await sb
    .from("challenges")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      start_date: $("adv_start_date").value || null,
      end_date: $("adv_end_date").value || null,
      points: Number($("adv_points").value || 10),
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "challenge_created",
    title: "Nuevo reto 🎯",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " propuso el reto «" +
      title +
      "».",
    target_tab: "challenges",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

function openDateForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva fecha importante 📅",
    formShell(
      input("title", "Nombre", "text", "required") +
        `<div class="advFormGrid">${input("event_date", "Fecha", "date", "required")}${select(
          "category",
          "Categoría",
          [
            ["especial", "Especial"],
            ["aniversario", "Aniversario"],
            ["cumpleanos", "Cumpleaños"],
            ["viaje", "Viaje"],
            ["familia", "Familia"],
          ],
        )}</div>` +
        textarea("description", "Descripción") +
        select("recurrence_type", "Repetición", [
          ["none", "No se repite"],
          ["monthly", "Cada mes"],
          ["yearly", "Cada año"],
        ]) +
        input(
          "recurrence_interval",
          "Cada cuántos periodos",
          "number",
          'min="1" max="12" value="1"',
        ),
      `saveDate()`,
    ),
  );
}

function validateImportantDateForm() {
  const name = $("adv_title");
  const date = $("adv_event_date");
  name.setCustomValidity(
    name.value.trim() ? "" : "Escribe el nombre de la fecha.",
  );
  if (!name.reportValidity()) return false;
  return date.reportValidity();
}

async function saveDate() {
  if (!validateImportantDateForm()) return;
  if (advancedEditState.key === "dates" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim(),
    eventDate = $("adv_event_date").value,
    recurrenceType = $("adv_recurrence_type").value || "none",
    recurrenceInterval = Math.max(
      1,
      Number($("adv_recurrence_interval").value || 1),
    );

  const { data: created, error } = await sb
    .from("important_dates")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      event_date: eventDate,
      category: $("adv_category").value,
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      recurring: recurrenceType !== "none",
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "date_created",
    title: "Nueva fecha importante 📅",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó «" +
      title +
      "» para el " +
      formatDate(eventDate) +
      ".",
    target_tab: "dates",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
  render();
}

function openIdeaForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva idea 🎲",
    formShell(
      input("title", "Actividad") +
        textarea("description", "Descripción") +
        `<div class="advFormGrid">${select("category", "Categoría", [
          ["cita", "Cita"],
          ["casa", "En casa"],
          ["aventura", "Aventura"],
          ["comida", "Comida"],
          ["romantico", "Romántico"],
        ])}${input("estimated_budget", "Presupuesto aproximado", "number", 'min="0"')}</div>`,
      `saveIdea()`,
    ),
  );
}

async function saveIdea() {
  if (advancedEditState.key === "ideas" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe la actividad");
  const { data: created, error } = await sb
    .from("activity_ideas")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      title,
      description: $("adv_description").value,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      estimated_budget: $("adv_estimated_budget").value || null,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "idea_created",
    title: "Nueva idea para compartir 🎲",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó la idea «" +
      title +
      "».",
    target_tab: "ideas",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

function openPrivateForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nueva nota privada 🔐",
    formShell(
      input("title", "Título") +
        textarea("content", "Nota", "Solo tú podrás verla."),
      `savePrivate()`,
    ),
  );
}

async function savePrivate() {
  if (advancedEditState.key === "privateNotes" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim(),
    content = $("adv_content").value.trim();
  if (!title || !content) return appAlert("Completa la nota");
  const { error } = await sb
    .from("private_notes")
    .insert({ couple_id: couple.id, user_id: user.id, title, content });
  if (error) return appAlert(error.message);
  closeAdvModal();
  await advLoadAll();
}

function localDateTimeValue(v) {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function setAdvField(id, value) {
  const el = $(id);
  if (el) el.value = value ?? "";
}

function openAdvancedEdit(key, id) {
  const x = (advCache[key] || []).find((i) => i.id === id);
  if (!x) return appAlert("No encontramos este elemento.");
  if (key === "letters" && x.is_locked)
    return appAlert("Desbloquea la carta antes de editarla.");
  advancedEditState = { key, id };
  const fn = {
    memories: openMemoryForm,
    letters: openLetterForm,
    dreams: openDreamForm,
    challenges: openChallengeForm,
    dates: openDateForm,
    goals: openGoalForm,
    places: openPlaceForm,
    ideas: openIdeaForm,
    privateNotes: openPrivateForm,
  }[key];
  if (!fn) return;
  fn(true);
  $("advModalTitle").textContent = {
    memories: "Editar recuerdo 📸",
    letters: "Editar carta 💌",
    dreams: "Editar sueño ✨",
    challenges: "Editar reto 🎯",
    dates: "Editar fecha importante 📅",
    goals: "Editar meta 💰",
    places: "Editar lugar 📍",
    ideas: "Editar idea 🎲",
    privateNotes: "Editar nota privada 🔐",
  }[key];
  setAdvField("adv_title", key === "places" ? x.name : x.title);
  setAdvField("adv_description", x.description || "");
  if (key === "memories") {
    setAdvField("adv_memory_date", x.memory_date);
    setAdvField("adv_category", x.category || "momento");
    setAdvField("adv_location", x.location || "");
  } else if (key === "letters") {
    setAdvField("adv_category", x.category || "libre");
    setAdvField("adv_unlock_at", localDateTimeValue(x.unlock_at));
    $("adv_notify_on_unlock").checked = !!x.notify_on_unlock;
  } else if (key === "dreams") {
    setAdvField("adv_category", x.category || "viaje");
    setAdvField("adv_target_date", x.target_date || "");
    setAdvField("adv_budget", x.budget ?? "");
    setAdvField("adv_dream_goal",x.goal_id||"");
  } else if (key === "challenges") {
    setAdvField("adv_start_date", x.start_date || "");
    setAdvField("adv_end_date", x.end_date || "");
    setAdvField("adv_points", x.points || 10);
  } else if (key === "dates") {
    setAdvField("adv_event_date", x.event_date);
    setAdvField("adv_category", x.category || "especial");
    setAdvField(
      "adv_recurrence_type",
      x.recurrence_type || (x.recurring ? "yearly" : "none"),
    );
    setAdvField("adv_recurrence_interval", x.recurrence_interval || 1);
  } else if (key === "goals") {
    setAdvField("adv_target_amount", x.target_amount ?? "");
    setAdvField("adv_target_date", x.target_date || "");
  } else if (key === "places") {
    setAdvField("adv_address", x.address || "");
    setAdvField("adv_visit_date", x.visit_date || "");
    setAdvField("adv_latitude", x.latitude ?? "");
    setAdvField("adv_longitude", x.longitude ?? "");
    setAdvField("adv_category", x.category || "especial");
  } else if (key === "ideas") {
    setAdvField("adv_category", x.category || "cita");
    setAdvField("adv_estimated_budget", x.estimated_budget ?? "");
  } else if (key === "privateNotes") {
    setAdvField("adv_content", x.content || "");
  }
  prepareEditButton();
}

async function saveAdvancedEdit() {
  const { key, id } = advancedEditState;
  if (!key || !id) return;
  if (key === "dates" && !validateImportantDateForm()) return;
  let patch = {};
  let letterAudio;
  let priorLetterAudio;
  if (key === "memories") {
    patch = {
      title: $("adv_title").value.trim(),
      memory_date: $("adv_memory_date").value,
      category: $("adv_category").value,
      description: $("adv_description").value,
      location: selectedPlaceById($("adv_place_id")?.value)?.name || null,
      place_id: $("adv_place_id")?.value || null,
    };
    const f = $("adv_photo")?.files?.[0];
    if (f) {
      const path = `${couple.id}/memories/${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      if (!validateMemoryFile(f)) return;
      const up = await sb.storage
        .from("couple-media")
        .upload(path, f, { upsert: false });
      if (up.error)
        return appAlert("No se pudo subir la nueva foto: " + up.error.message);
      patch.photo_url = path;
      patch.photo_x=50;patch.photo_y=50;patch.photo_zoom=1;
    }
  } else if (key === "letters") {
    const title = $("adv_title").value.trim();
    const draft = letterDraft();
    if (!title || !draft.content)
      return appAlert("Completa el título y la carta ❤️");
    const letter = advCache.letters.find((item) => item.id === id);
    if (letter?.is_locked)
      return appAlert("Desbloquea la carta antes de editarla.");
    priorLetterAudio = letter?.audio_path;
    try {
      letterAudio = await uploadLetterAudio(letter);
    } catch (error) {
      return appAlert(error.message);
    }
    patch = {
      title,
      ...draft,
      audio_path: letterAudio.audio_path,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      notify_on_unlock:
        !!$("adv_unlock_at").value && $("adv_notify_on_unlock").checked,
      unlock_at: $("adv_unlock_at").value
        ? new Date($("adv_unlock_at").value).toISOString()
        : null,
    };
  } else if (key === "dreams") {
    patch = {
      title: $("adv_title").value.trim(),
      description: $("adv_description").value,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      target_date: $("adv_target_date").value || null,
      budget: $("adv_budget").value || null,
      goal_id: $("adv_dream_goal")?.value || null,
    };
  } else if (key === "challenges") {
    patch = {
      title: $("adv_title").value.trim(),
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      start_date: $("adv_start_date").value || null,
      end_date: $("adv_end_date").value || null,
      points: Number($("adv_points").value || 10),
    };
  } else if (key === "dates") {
    const rt = $("adv_recurrence_type").value || "none";
    patch = {
      title: $("adv_title").value.trim(),
      event_date: $("adv_event_date").value,
      category: $("adv_category").value,
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      recurring: rt !== "none",
      recurrence_type: rt,
      recurrence_interval: Math.max(
        1,
        Number($("adv_recurrence_interval").value || 1),
      ),
    };
  } else if (key === "goals") {
    patch = {
      title: $("adv_title").value.trim(),
      description: $("adv_description").value,
      place_id: $("adv_place_id")?.value || null,
      target_amount: $("adv_target_amount").value || null,
      target_date: $("adv_target_date").value || null,
    };
  } else if (key === "places") {
    patch = {
      name: $("adv_title").value.trim(),
      description: $("adv_description").value,
      address: $("adv_address").value,
      visit_date: $("adv_visit_date").value || null,
      latitude:
        $("adv_latitude").value === "" ? null : Number($("adv_latitude").value),
      longitude:
        $("adv_longitude").value === ""
          ? null
          : Number($("adv_longitude").value),
      google_maps_url: $("adv_google_maps_url").value.trim() || null,
      category: $("adv_category").value,
    };
  } else if (key === "ideas") {
    patch = {
      title: $("adv_title").value.trim(),
      description: $("adv_description").value,
      category: $("adv_category").value,
      place_id: $("adv_place_id")?.value || null,
      estimated_budget: $("adv_estimated_budget").value || null,
    };
  } else if (key === "privateNotes") {
    patch = {
      title: $("adv_title").value.trim(),
      content: $("adv_content").value.trim(),
    };
  }
  if (!(key === "places" ? patch.name : patch.title))
    return appAlert("El título es obligatorio.");
  if ((key === "letters" || key === "privateNotes") && !patch.content)
    return appAlert("El contenido no puede quedar vacío.");
  const { error } = await sb.from(advTables[key]).update(patch).eq("id", id);
  if (error) {
    if (letterAudio?.uploaded) await removeLetterAudio(letterAudio.uploaded);
    if (key === "memories" && patch.photo_url)
      await sb.storage.from("couple-media").remove([patch.photo_url]);
    return appAlert("No se pudo guardar: " + error.message);
  }
  if (letterAudio && letterAudio.audio_path !== priorLetterAudio)
    await removeLetterAudio(priorLetterAudio);
  if (key !== "privateNotes") {
    const tab =
      {
        memories: "memories",
        letters: "letters",
        dreams: "dreams",
        challenges: "challenges",
        dates: "dates",
        goals: "goals",
        places: "places",
        ideas: "ideas",
      }[key] || "home";
    const label =
      {
        memories: "recuerdo",
        letters: "carta",
        dreams: "sueño",
        challenges: "reto",
        dates: "fecha importante",
        goals: "meta",
        places: "lugar",
        ideas: "idea",
      }[key] || "elemento";
    await createPartnerNotification({
      event_type: "shared_" + key + "_updated",
      title: "Actualización: " + label + " ❤️",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        " actualizó «" +
        (patch.name || patch.title || "un elemento") +
        "».",
      target_tab: tab,
      target_id: id,
    });
  }
  closeAdvModal();
  advancedEditState = { key: null, id: null };
  await advLoadAll();
}

async function deleteAdvanced(key, id) {
  if (key === "letters") {
    const letter = advCache.letters.find((x) => x.id === id);
    if (letter?.is_locked)
      return appAlert(
        "Esta carta está bloqueada 🔒. Desbloquéala antes de eliminarla.",
      );
  }
  if (!(await appConfirm("¿Eliminar este elemento?"))) return;
  return withTransactionIndicator(async () => {
    const item = (advCache[key] || []).find((x) => x.id === id);
    const { error } = await sb.from(advTables[key]).delete().eq("id", id);
    if (error) return appAlert(error.message);
    if (key === "letters") await removeLetterAudio(item?.audio_path);
    if (key !== "privateNotes" && item) {
      const tab =
        {
          memories: "memories",
          letters: "letters",
          dreams: "dreams",
          challenges: "challenges",
          dates: "dates",
          goals: "goals",
          places: "places",
          ideas: "ideas",
        }[key] || "home";
      const label =
        {
          memories: "recuerdo",
          letters: "carta",
          dreams: "sueño",
          challenges: "reto",
          dates: "fecha importante",
          goals: "meta",
          places: "lugar",
          ideas: "idea",
        }[key] || "elemento";
      await createPartnerNotification({
        event_type: "shared_" + key + "_deleted",
        title: "Se eliminó un " + label,
        body:
          (myProfile?.display_name || defaultDisplayName()) +
          " eliminó «" +
          (item.name || item.title || "un elemento") +
          "».",
        target_tab: tab,
      });
    }
    await advLoadAll();
  })();
}

async function toggleFavorite(key, id, val) {
  const item = (advCache[key] || []).find((x) => x.id === id);
  const { error } = await sb
    .from(advTables[key])
    .update({ favorite: val })
    .eq("id", id);
  if (error) return appAlert(error.message);
  if (item && key !== "privateNotes")
    await createPartnerNotification({
      event_type: "favorite_changed",
      title: val ? "Nuevo favorito ❤️" : "Favorito actualizado",
      body:
        (myProfile?.display_name || defaultDisplayName()) +
        (val ? " marcó como favorito" : " quitó de favoritos") +
        " «" +
        (item.name || item.title || "un elemento") +
        "».",
      target_tab: key,
      target_id: id,
    });
  await advLoadAll();
}

async function setDreamStatus(id, status) {
  const dream = advCache.dreams.find((x) => x.id === id);
  const { error } = await sb
    .from("dreams")
    .update({
      status,
      completed_at: status === "cumplido" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "dream_status_changed",
    title:
      status === "cumplido" ? "¡Sueño cumplido! ✨" : "Sueño actualizado ✨",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      (status === "cumplido" ? " marcó como cumplido" : " actualizó") +
      " el sueño «" +
      (dream?.title || "un sueño") +
      "».",
    target_tab: "dreams",
    target_id: id,
  });
  await advLoadAll();
}

async function toggleChallenge(id, val) {
  const challenge = advCache.challenges.find((x) => x.id === id);
  const { error } = await sb
    .from("challenges")
    .update({
      completed: val,
      completed_at: val ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "challenge_status_changed",
    title: val ? "¡Reto completado! 🎯" : "Reto actualizado 🎯",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      (val ? " completó" : " actualizó") +
      " el reto «" +
      (challenge?.title || "un reto") +
      "».",
    target_tab: "challenges",
    target_id: id,
  });
  await advLoadAll();
}

function randomIdea() {
  const arr = advCache.ideas;
  if (!arr.length) {
    openIdeaForm();
    return;
  }
  const x = arr[Math.floor(Math.random() * arr.length)];
  const box = $("randomIdeaBox");
  if (box)
    box.innerHTML = `<div style="font-size:50px">🎲</div><h3>${esc(x.title)}</h3><p>${esc(x.description || "")}</p>${x.estimated_budget ? `<div class="advMeta">Presupuesto aproximado: ${money(x.estimated_budget)}</div>` : ""}<button class="btn primary" onclick="scheduleIdea('${x.id}')">🗓️ Agendar esta idea</button><button class="btn" onclick="randomIdea()" style="margin-top:12px">🎲 Otra idea</button>`;
  sb.from("activity_ideas")
    .update({ used_count: (x.used_count || 0) + 1 })
    .eq("id", x.id);
}
