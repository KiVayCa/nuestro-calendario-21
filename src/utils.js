function counters() {
  const togetherDays = days(new Date("2026-01-21T00:00:00"));

  const datingDays = days(new Date("2026-04-21T00:00:00"));

  $("together").innerHTML = togetherDays + " <small>días juntos</small>";

  $("dating").innerHTML = datingDays + " <small>días de novios</small>";

  $("story").textContent = togetherDays + " días de historia";
}

function setLoginLoading(loading) {
  const button = $("loginBtn");
  if (!button) return;
  button.classList.toggle("is-loading", loading);
  button.disabled = loading;
  button.setAttribute("aria-busy", loading ? "true" : "false");
  button.innerHTML = loading
    ? '<span class="loginButtonHeart" aria-hidden="true">♥</span><span>Ingresando a nuestro espacio…</span>'
    : "Entrar ❤️";
}

async function register() {
  try {
    const email = $("email").value.trim().toLowerCase();

    const password = $("password").value;

    if (!email) {
      setMsg("Escribe tu correo ❤️");

      return;
    }

    if (password.length < 6) {
      setMsg("La contraseña debe tener mínimo 6 caracteres.");

      return;
    }

    $("registerBtn").disabled = true;

    setMsg("Creando tu cuenta…");

    const { data, error } = await sb.auth.signUp({
      email: email,

      password: password,

      options: {
        emailRedirectTo: "https://nuestrocalendario21.vercel.app/",
      },
    });

    $("registerBtn").disabled = false;

    if (error) {
      console.error(error);

      setMsg(error.message);

      return;
    }

    if (data.session) {
      user = data.user;
      if (authSetupUserId !== data.user.id) {
        authSetupUserId = data.user.id;
        document.body.classList.add("auth-pending");
        await setup();
      }
    } else {
      setMsg(
        "Cuenta creada. Revisa tu correo para confirmar tu cuenta ❤️",
        true,
      );
    }
  } catch (err) {
    console.error(err);

    $("registerBtn").disabled = false;

    setMsg("No pudimos crear la cuenta.");
  }
}

function revealAuthDestination() {
  // Una sola transición: el loader cubre el destino hasta que el navegador
  // haya calculado su layout y pueda pintarlo sin mostrar estados intermedios.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      document.body.classList.add("nc-auth-reveal");
      document.body.classList.remove("auth-pending");
      window.setTimeout(
        () => document.body.classList.remove("nc-auth-reveal"),
        500,
      );
    }),
  );
}

async function showApp() {
  setLoginLoading(false);
  $("login").classList.add("hidden");

  $("join").classList.add("hidden");

  $("app").classList.remove("hidden");

  await loadPlans();

  await setupPlanRealtime();

  const advArea = $("advancedArea");
  const cardsArea = document.querySelector(".cards");
  if (advArea && cardsArea)
    cardsArea.parentNode.insertBefore(advArea, cardsArea);
  document.body.classList.add("app-ready");
  const appEl = $("app"),
    advEl = $("advancedArea");
  if (appEl && advEl && appEl.firstElementChild !== advEl)
    appEl.insertBefore(advEl, appEl.firstElementChild);
  const ws = document.querySelector(".workspace");
  if (ws) ws.classList.add("tab-hidden");
  const requestedTab = new URLSearchParams(location.search).get("tab");
  showAdvancedTab(
    validAdvancedTabs.has(requestedTab) ? requestedTab : advancedTab,
    { skipScroll: true },
  );
  // Mantener la portada de carga hasta que Inicio tenga sus datos y su foto
  // definitivos. Evita mostrar el collage provisional y cambiar su altura.
  await initAdvanced();
  if (advancedTab === "home") await applyHomePhoto();
  void repairPushSubscriptionIfMissing();
  revealAuthDestination();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")

    .replace(/</g, "&lt;")

    .replace(/>/g, "&gt;")

    .replace(/"/g, "&quot;")

    .replace(/'/g, "&#039;");
}

const PLAN_CATEGORY_GROUPS = [
  ["Momentos juntos", [
    ["cita", "♡", "Cita"], ["comida", "🍽️", "Comida y restaurantes"],
    ["cine", "🎬", "Cine y entretenimiento"], ["aniversario", "💜", "Aniversario"],
    ["celebracion", "🎉", "Celebración y cumpleaños"], ["sorpresa", "🎁", "Sorpresa y regalo"],
  ]],
  ["Experiencias", [
    ["paseo", "🏍️", "Paseo"], ["viaje", "✈️", "Viaje"],
    ["aventura", "⛰️", "Aventura y naturaleza"], ["deporte", "⚽", "Deporte y ejercicio"],
    ["cultura", "🎭", "Cultura y eventos"], ["descanso", "☕", "Descanso y relajación"],
  ]],
  ["Vida compartida", [
    ["familia", "👨‍👩‍👧", "Familia"], ["amigos", "🤝", "Amigos"],
    ["iglesia", "⛪", "Iglesia y vida espiritual"], ["hogar", "🏡", "Hogar"],
    ["compras", "🛍️", "Compras"], ["salud", "🩺", "Salud y bienestar"],
    ["estudio", "📚", "Estudio"], ["trabajo", "💼", "Trabajo"],
    ["tramites", "📋", "Trámites y compromisos"], ["otro", "⭐", "Otro"],
  ]],
];

const PLAN_CATEGORY_BY_KEY = new Map(PLAN_CATEGORY_GROUPS.flatMap(([, items]) => items.map(([key, icon, name]) => [key, { icon, name }])));

function categoryIcon(category) {
  return PLAN_CATEGORY_BY_KEY.get(category)?.icon || "♡";
}

function categoryName(category) {
  return PLAN_CATEGORY_BY_KEY.get(category)?.name || "Cita";
}

function populatePlanCategorySelect(select, selected = "cita", filter = false) {
  if (!select) return;
  select.innerHTML = (filter ? '<option value="">Todas las categorías</option>' : "") +
    PLAN_CATEGORY_GROUPS.map(([group, items]) => `<optgroup label="${group}">${items.map(([key, icon, name]) => `<option value="${key}">${icon} ${name}</option>`).join("")}</optgroup>`).join("");
  select.value = PLAN_CATEGORY_BY_KEY.has(selected) ? selected : filter ? "" : "cita";
}

function formatTime(time) {
  if (!time) return "";

  const parts = time.split(":");

  let hour = parseInt(parts[0], 10);

  const minute = parts[1] || "00";

  const suffix = hour >= 12 ? "p. m." : "a. m.";

  hour = hour % 12 || 12;

  return hour + ":" + minute + " " + suffix;
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "";

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

function handleDayClick(date) {
  // El festivo ofrece información y una acción explícita para crear un plan.
  if (colombianHolidayNames(parseDateOnly(date)).length) openCalendarHoliday(date);
  else openModal(date);
}

function dateKeyLocal(d) {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function addMonthsSafe(d, n) {
  const day = d.getDate();
  const x = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const max = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate();
  x.setDate(Math.min(day, max));
  return x;
}

function occurrenceAllowed(plan, d) {
  const date = dateKeyLocal(d);
  return (
    !(plan.skipped_occurrences || []).includes(date) &&
    (!plan.recurrence_end_date || date <= plan.recurrence_end_date)
  );
}

function closeDetailModal() {
  closeInlineCalendarModal("detailModal");

  currentPlan = null;
}

function closeInlineCalendarModal(id) {
  const modal = $(id);
  if (modal.style.display !== "grid" || modal.classList.contains("is-closing")) return;
  modal.classList.add("is-closing");
  window.setTimeout(() => {
    if (!modal.classList.contains("is-closing")) return;
    modal.style.display = "none";
    modal.classList.remove("is-closing");
  }, 210);
}

function esc(v) {
  return String(v ?? "").replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}

function dateES(v) {
  if (!v) return "Sin fecha";
  const d = new Date(v + "T00:00:00");
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function advHeader(title, sub, button, action) {
  const styles={
    "Nuestros recuerdos":["📸","MOMENTOS QUE PERDURAN"],
    "Cartas para nosotros":["💌","PALABRAS DEL CORAZÓN"],
    "Nuestra lista de sueños":["✨","SOÑAR JUNTOS"],
    "Nuestras metas":["💰","CADA APORTE CUENTA"],
    "Retos de pareja":["🎯","CRECER JUNTOS"],
    "¿Qué hacemos hoy?":["🎲","DESCUBRAMOS ALGO NUEVO"],
    "Fechas importantes":["📅","DÍAS PARA RECORDAR"],
    "Nuestros lugares":["📍","HUELLAS EN EL MAPA"],
    "Presupuesto familiar":["💰","CONSTRUYENDO ESTABILIDAD"],
    "Notificaciones":["🔔","AL DÍA CON NOSOTROS"],
    "La pregunta de hoy":["💭","CONOCERNOS CADA DÍA"],
    "Nuestros logros":["🏆","CELEBREMOS CADA PASO"],
    "Mi rincón privado":["🔐","UN ESPACIO PARA TI"],
    "Configuración":["⚙️","A NUESTRA MANERA"],
    "Análisis":["📊","NUESTRO CAMINO EN NÚMEROS"],
  };
  const [icon,kicker]=styles[title]||["♡","NUESTRO ESPACIO"];
  const actions=button?`<div class="moduleHeroActions"><button type="button" class="btn primary" onclick="${action}">${button}</button></div>`:"";
  const subsection=title==="Nuestra lista de sueños"||title==="Nuestras metas";
  if(subsection)return `<div class="moduleSubheading"><div><h3>${icon} ${title}</h3><p>${sub}</p></div>${actions}</div>`;
  return `<div class="bondHero moduleHero"><div class="bondHeroHeart" aria-hidden="true">${icon}</div><small>${kicker}</small><h2>${title}</h2><p>${sub}</p>${actions}</div>`;
}

function pushBase64UrlToBytes(value) {
  const pad = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

function budgetPersonStats(uid, items) {
  const mine = items.filter((e) => e.owner_user_id === uid);
  const income = mine
    .filter((e) => e.entry_type === "income")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  const expenses = mine
    .filter((e) => e.entry_type !== "income")
    .reduce((s, e) => s + Number(e.amount || 0), 0);
  return { income, expenses, liquidity: income - expenses, count: mine.length };
}

function budgetBar(label, value, max, kind) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    '<div class="budgetBarRow"><div class="budgetBarLabel"><span>' +
    esc(label) +
    "</span><strong>" +
    money(value) +
    '</strong></div><div class="budgetBarTrack"><span class="budgetBarFill ' +
    (kind || "") +
    '" style="width:' +
    pct +
    '%"></span></div></div>'
  );
}

function openConfirmModal(title, message, confirmLabel, action) {
  openAdvModal(
    title,
    '<div class="moneyModalIntro"><span>💗</span><div><strong>' +
      esc(message) +
      '</strong></div></div><div class="moneyModalActions"><button class="btn" onclick="closeAdvModal()">Cancelar</button><button class="btn danger" onclick="' +
      action +
      '">' +
      esc(confirmLabel) +
      "</button></div>",
  );
}

function openPlaceForm(isEdit = false) {
  if (!isEdit) advancedEditState = { key: null, id: null };
  openAdvModal(
    "Nuevo lugar 📍",
    formShell(
      input("title", "Nombre del lugar") +
        textarea("description", "Qué significa para ustedes") +
        `<div class="advFormGrid">${input("address", "Dirección")}${input("visit_date", "Fecha", "date")}</div>` +
        `<div class="advFormGrid">${input("latitude", "Latitud", "number", 'step="any"')}${input("longitude", "Longitud", "number", 'step="any"')}</div>` +
        select("category", "Categoría", [
          ["especial", "Especial"],
          ["cita", "Cita"],
          ["viaje", "Viaje"],
          ["restaurante", "Restaurante"],
          ["hogar", "Hogar"],
        ]),
      `savePlace()`,
    ),
  );
}

async function savePlace() {
  if (advancedEditState.key === "places" && advancedEditState.id)
    return saveAdvancedEdit();
  const title = $("adv_title").value.trim();
  if (!title) return appAlert("Escribe el nombre del lugar");
  const { data: created, error } = await sb
    .from("places")
    .insert({
      couple_id: couple.id,
      created_by: user.id,
      name: title,
      description: $("adv_description").value,
      address: $("adv_address").value,
      visit_date: $("adv_visit_date").value || null,
      latitude: $("adv_latitude").value || null,
      longitude: $("adv_longitude").value || null,
      category: $("adv_category").value,
    })
    .select("id")
    .single();
  if (error) return appAlert(error.message);
  await createPartnerNotification({
    event_type: "place_created",
    title: "Nuevo lugar en el mapa 📍",
    body:
      (myProfile?.display_name || defaultDisplayName()) +
      " agregó el lugar «" +
      title +
      "».",
    target_tab: "places",
    target_id: created.id,
  });
  closeAdvModal();
  await advLoadAll();
}

function prepareEditButton() {
  const b = $("#advModalBody .btn.primary");
  if (b) {
    b.textContent = "Guardar cambios ❤️";
    b.setAttribute("onclick", "saveAdvancedEdit()");
  }
}

async function profileAvatarUrl(path) {
  return signedPhoto(path);
}
