function cachedHomePhotoUrl() {
  const path = coupleSettings.home_photo_path;
  if (!path) return null;
  try {
    const cached = JSON.parse(
      localStorage.getItem("nc21_signed_photo_" + encodeURIComponent(path)) ||
        "null",
    );
    if (cached?.url && cached.expiresAt > Date.now() + 10 * 60 * 1000)
      return cached.url;
  } catch (_) {}
  return null;
}

async function loadCoupleSettings() {
  const { data } = await sb
    .from("couple_settings")
    .select("*")
    .eq("couple_id", couple.id)
    .maybeSingle();
  if (data) coupleSettings = { ...coupleSettings, ...data };
  applyCoupleSettings();
}

function applyCoupleSettings() {
  const root = document.documentElement,
    body = document.body,
    theme = coupleSettings.theme || "romance",
    accent = coupleSettings.accent_color || "#e64d78";
  body.dataset.theme = theme;
  body.style.setProperty("--rose", accent);
  root.style.setProperty("--rose", accent);
  root.style.setProperty("--bodybg", coupleSettings.background_color || "");
  root.style.setProperty("--accent", accent);
  root.removeAttribute("data-nc-theme-boot");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", accent);
  try {
    const css = getComputedStyle(body);
    const palette = {
      soft: css.getPropertyValue("--soft").trim(),
      ink: css.getPropertyValue("--ink").trim(),
      muted: css.getPropertyValue("--muted").trim(),
      line: css.getPropertyValue("--line").trim(),
      surface: css.getPropertyValue("--surface").trim(),
      bodybg: css.getPropertyValue("--bodybg").trim(),
    };
    localStorage.setItem(
      "nc21_couple_settings",
      JSON.stringify({ ...coupleSettings, palette }),
    );
  } catch (_) {}
  body.classList.add("nc-theme-ready");
}

async function applyHomePhoto() {
  const token = ++homePhotoApplyToken;
  const root = document.documentElement;
  const path = coupleSettings.home_photo_path;
  if (path) root.dataset.ncHomePhotoPending = "1";
  let url = null;
  try {
    url = await signedPhoto(path);
  } catch (_) {}
  if (token !== homePhotoApplyToken) return;
  const finalUrl = url || "pareja.jpeg";
  await new Promise((resolve) => {
    const preload = new Image();
    preload.decoding = "async";
    preload.fetchPriority = "high";
    preload.onload = resolve;
    preload.onerror = resolve;
    preload.src = finalUrl;
    if (preload.complete) resolve();
  });
  if (token !== homePhotoApplyToken) return;
  document.querySelectorAll("[data-home-photo]").forEach((img) => {
    img.style.objectPosition = "center center";
    if (img.src !== finalUrl) img.src = finalUrl;
    const syncHeroFrame = () => {
      const hero = img.closest(".homeWelcome");
      if (!hero || !img.naturalWidth || !img.naturalHeight) return;
      const content = hero.querySelector(".homeWelcomeContent");
      const ratio = img.naturalWidth / img.naturalHeight;
      const width = hero.clientWidth || hero.parentElement?.clientWidth || 0;
      const contentHeight = (content?.scrollHeight || 0) + 56;
      const height = Math.max(380, Math.ceil(width / ratio), contentHeight);
      hero.style.minHeight = "0";
      hero.style.height = Math.min(720, height) + "px";
    };
    if (img.complete) syncHeroFrame();
    else img.addEventListener("load", syncHeroFrame, { once: true });
  });
  root.removeAttribute("data-nc-home-photo-pending");
}

async function saveCoupleSettings(patch) {
  const payload = {
    ...coupleSettings,
    ...patch,
    couple_id: couple.id,
    updated_by: user.id,
  };
  const { data, error } = await sb
    .from("couple_settings")
    .upsert(payload, { onConflict: "couple_id" })
    .select()
    .single();
  if (error) {
    appAlert("No se pudo guardar la configuración: " + error.message);
    return false;
  }
  coupleSettings = { ...coupleSettings, ...data };
  applyCoupleSettings();
  await applyHomePhoto();
  return true;
}

async function uploadCouplePhoto(inputId, field) {
  const f = $(inputId)?.files?.[0];
  if (!f) return;
  if (!f.type.startsWith("image/")) {
    appAlert("Selecciona una imagen.");
    return;
  }
  if (f.size > 8 * 1024 * 1024) {
    appAlert("La imagen debe pesar menos de 8 MB.");
    return;
  }
  if (field === "home_photo_path") {
    openHomePhotoCropEditor(f);
    return;
  }
  const old = coupleSettings[field];
  const path = `${couple.id}/settings/${field}-${crypto.randomUUID()}-${f.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const up = await sb.storage
    .from("couple-media")
    .upload(path, f, { upsert: false });
  if (up.error) {
    appAlert("No se pudo subir la foto: " + up.error.message);
    return;
  }
  const ok = await saveCoupleSettings({ [field]: path });
  if (!ok) {
    await sb.storage.from("couple-media").remove([path]);
    return;
  }
  if (old && old !== path) await sb.storage.from("couple-media").remove([old]);
  await renderSettingsPhotoPreviews();
}

async function signedPhoto(path) {
  if (!path) return null;
  const cacheKey = "nc21_signed_photo_" + encodeURIComponent(path);
  const now = Date.now();
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
    if (cached?.url && cached.expiresAt > now + 10 * 60 * 1000)
      return cached.url;
  } catch (_) {}
  const { data, error } = await sb.storage
    .from("couple-media")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (error || !data?.signedUrl) return null;
  try {
    localStorage.setItem(
      cacheKey,
      JSON.stringify({
        url: data.signedUrl,
        expiresAt: now + 6 * 24 * 60 * 60 * 1000,
      }),
    );
  } catch (_) {}
  return data.signedUrl;
}

function openHomePhotoCropEditor(file) {
  const objectUrl = URL.createObjectURL(file),
    image = new Image();
  homePhotoCropState = { file, objectUrl, image, zoom: 1, x: 50, y: 50 };
  image.onload = () => {
    if (!homePhotoCropState || homePhotoCropState.objectUrl !== objectUrl)
      return;
    openAdvModal(
      "Ajustar foto de portada ❤️",
      `<p class="homePhotoCropHint">Mueve el encuadre con los controles y mira cómo quedará en Inicio. La imagen final se guardará ya ajustada para que se vea igual en todos sus dispositivos.</p>
      <canvas id="homePhotoCropCanvas" class="homePhotoCropPreview" width="1600" height="600" aria-label="Vista previa del recorte de la foto"></canvas>
      <div class="homePhotoCropControls">
        <div><label for="homePhotoZoom"><span>🔎 Zoom</span><output id="homePhotoZoomValue">1.00×</output></label><input id="homePhotoZoom" type="range" min="1" max="3" step="0.05" value="1" oninput="updateHomePhotoCrop('zoom',this.value)"></div>
        <div><label for="homePhotoX"><span>↔️ Encuadre horizontal</span><output id="homePhotoXValue">50%</output></label><input id="homePhotoX" type="range" min="0" max="100" step="1" value="50" oninput="updateHomePhotoCrop('x',this.value)"></div>
        <div><label for="homePhotoY"><span>↕️ Encuadre vertical</span><output id="homePhotoYValue">50%</output></label><input id="homePhotoY" type="range" min="0" max="100" step="1" value="50" oninput="updateHomePhotoCrop('y',this.value)"></div>
      </div>
      <div class="modalBtns"><button class="btn" onclick="cancelHomePhotoCrop()">Cancelar</button><button class="btn primary" id="saveHomePhotoCropBtn" onclick="saveHomePhotoCrop()">Guardar encuadre ❤️</button></div>`,
    );
    const canvas = $("homePhotoCropCanvas");
    if (canvas) {
      const mobile = window.matchMedia("(max-width: 600px)").matches;
      canvas.width = 1200;
      canvas.height = mobile ? 1200 : 450;
      canvas.style.aspectRatio = "auto";
    }
    drawHomePhotoCrop();
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    homePhotoCropState = null;
    appAlert("No se pudo abrir esa imagen. Prueba con otra foto.");
  };
  image.src = objectUrl;
}

function drawHomePhotoCrop() {
  const st = homePhotoCropState,
    canvas = $("homePhotoCropCanvas");
  if (!st || !canvas || !st.image.naturalWidth) return;
  const ctx = canvas.getContext("2d"),
    ratio = canvas.width / canvas.height;
  const baseW = Math.min(st.image.naturalWidth, st.image.naturalHeight * ratio),
    baseH = baseW / ratio;
  const cropW = baseW / st.zoom,
    cropH = baseH / st.zoom;
  const sx = (st.image.naturalWidth - cropW) * (st.x / 100),
    sy = (st.image.naturalHeight - cropH) * (st.y / 100);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(
    st.image,
    sx,
    sy,
    cropW,
    cropH,
    0,
    0,
    canvas.width,
    canvas.height,
  );
  const zv = $("homePhotoZoomValue"),
    xv = $("homePhotoXValue"),
    yv = $("homePhotoYValue");
  if (zv) zv.textContent = st.zoom.toFixed(2) + "×";
  if (xv) xv.textContent = Math.round(st.x) + "%";
  if (yv) yv.textContent = Math.round(st.y) + "%";
}

function updateHomePhotoCrop(key, value) {
  if (!homePhotoCropState) return;
  homePhotoCropState[key] = Number(value);
  drawHomePhotoCrop();
}

function cancelHomePhotoCrop() {
  if (homePhotoCropState?.objectUrl)
    URL.revokeObjectURL(homePhotoCropState.objectUrl);
  homePhotoCropState = null;
  closeAdvModal();
  const input = $("settingsHomePhoto");
  if (input) input.value = "";
}

async function saveHomePhotoCrop() {
  const st = homePhotoCropState,
    canvas = $("homePhotoCropCanvas"),
    button = $("saveHomePhotoCropBtn");
  if (!st || !canvas) return;
  if (button) {
    button.disabled = true;
    button.textContent = "Guardando foto…";
  }
  try {
    const blob = await new Promise((resolve, reject) =>
      canvas.toBlob(
        (b) =>
          b ? resolve(b) : reject(new Error("No se pudo preparar la imagen")),
        "image/jpeg",
        0.94,
      ),
    );
    const old = coupleSettings.home_photo_path;
    const path = `${couple.id}/settings/home_photo_path-${crypto.randomUUID()}-encuadre.jpg`;
    const up = await sb.storage
      .from("couple-media")
      .upload(path, blob, { contentType: "image/jpeg", upsert: false });
    if (up.error) throw up.error;
    const ok = await saveCoupleSettings({ home_photo_path: path });
    if (!ok) {
      await sb.storage.from("couple-media").remove([path]);
      if (button) {
        button.disabled = false;
        button.textContent = "Guardar encuadre ❤️";
      }
      return;
    }
    if (old && old !== path)
      await sb.storage.from("couple-media").remove([old]);
    if (st.objectUrl) URL.revokeObjectURL(st.objectUrl);
    homePhotoCropState = null;
    closeAdvModal();
    const input = $("settingsHomePhoto");
    if (input) input.value = "";
    await renderSettingsPhotoPreviews();
    renderAdvanced();
    appAlert("❤️ Foto de portada guardada con el encuadre elegido.");
  } catch (error) {
    if (button) {
      button.disabled = false;
      button.textContent = "Guardar encuadre ❤️";
    }
    appAlert("No se pudo guardar la foto: " + (error?.message || error));
  }
}

async function renderSettingsPhotoPreviews() {
  const root = document.documentElement,
    home = $("settingsHomePreview"),
    logo = $("settingsLogoPreview");
  const hasHome = !!coupleSettings.home_photo_path;
  if (hasHome) root.dataset.ncSettingsPhotoPending = "1";
  const [homeUrl, logoUrl] = await Promise.all([
    signedPhoto(coupleSettings.home_photo_path),
    signedPhoto(coupleSettings.logo_photo_path),
  ]);
  if (home) {
    home.src = homeUrl || "pareja.jpeg";
    home.onload = () => {
      if (homeUrl) root.removeAttribute("data-nc-settings-photo-pending");
    };
  }
  if (logo) logo.src = logoUrl || "pareja.jpeg";
  if (!homeUrl) root.removeAttribute("data-nc-settings-photo-pending");
}

function renderAdvSettings() {
  if (!settingsDraft)
    settingsDraft = {
      theme: coupleSettings.theme || "romance",
      accent_color: coupleSettings.accent_color || "#e64d78",
      background_color: coupleSettings.background_color || "#fff7fa",
    };
  const themes = [
    ["romance", "🌹 Romance", "#e64d78", "#fff7fa"],
    ["night", "🌙 Noche", "#d78aa7", "#1d151b"],
    ["lavender", "🌸 Lavanda", "#9a78c7", "#f7f3ff"],
    ["sunset", "🌅 Atardecer", "#d96b48", "#fff6ef"],
    ["ocean", "🌊 Océano", "#4b8fb4", "#f1fbff"],
    ["cherry", "🍒 Cereza", "#d7265e", "#ffe3eb"],
    ["emerald", "🌿 Esmeralda", "#2f8f73", "#e0f4ec"],
    ["coffee", "☕ Café", "#a56a43", "#f3e3d5"],
    ["sakura", "🌸 Sakura", "#e58cab", "#ffe9f1"],
    ["royal", "👑 Royal", "#7255b5", "#ece5fb"],
    ["forest", "🌲 Bosque", "#557a55", "#e4efe2"],
    ["wine", "🍷 Vino", "#9d3d58", "#f4dfe6"],
    ["sky", "☁️ Cielo", "#4c8ec4", "#e3f1fb"],
    ["mint", "🍃 Menta", "#4a9b88", "#dff4ee"],
    ["peach", "🍑 Durazno", "#e58b62", "#ffeadf"],
    ["gold", "✨ Dorado", "#b48a2d", "#f8efd2"],
    ["plum", "🪻 Ciruela", "#8d4f91", "#f1e3f1"],
    ["midnight", "🌌 Medianoche", "#8ca8ff", "#252c47"],
    ["charcoal", "🖤 Carbón", "#d9a7b8", "#34343a"],
    ["blush", "🌷 Blush", "#c95f87", "#f7dce7"],
    ["ice", "🧊 Hielo", "#639eb7", "#e2f3f8"],
    ["rosewood", "🌹 Rosewood", "#a74d62", "#f1dfe4"],
    ["aurora", "🌌 Aurora", "#65a6a4", "#dff1ee"],
    ["sage", "🌱 Salvia", "#64856a", "#e5efe4"],
    ["blueberry", "🫐 Arándano", "#6476c8", "#e9edff"],
    ["terracotta", "🏺 Terracota", "#b85f48", "#f7e4db"],
    ["butter", "🌼 Vainilla", "#a98527", "#fff4cf"],
    ["lagoon", "🩵 Laguna", "#258e95", "#dff4f2"],
    ["rosegold", "✨ Oro rosa", "#b76e79", "#f5e1e4"],
    ["porcelain", "🤍 Porcelana", "#667085", "#e9edf2"],
    ["citrus", "🍋 Cítrico", "#718b2e", "#edf4d8"],
    ["denim", "🧵 Denim", "#477da8", "#e3eef7"],
    ["cinnamon", "🪵 Canela", "#a45f36", "#f4e5d8"],
    ["orchid", "🌺 Orquídea", "#9b6aa8", "#f1e6f4"],
  ];
  const active = settingsDraft.theme || coupleSettings.theme || "romance";
  return (
    advHeader(
      "Configuración",
      "Hagan que Nuestro Calendario #21 se sienta todavía más de ustedes.",
      "💾 Guardar",
      "saveSettingsFromUI()",
    ) +
    `<div class="settingsCard" style="margin-bottom:16px"><h3>📲 Instalar en este dispositivo</h3><p>Abre Nuestro Calendario #21 como una aplicación en Android o PC, usando la misma cuenta y los mismos datos.</p><button class="btn primary" onclick="installCalendarApp()">Instalar / añadir a pantalla de inicio</button></div><div class="settingsGrid">
 <div class="settingsCard"><h3>🎨 Tema de la aplicación</h3><p>Elige el estilo general. Se guarda para los dos.</p><div class="themeChoices">${themes.map((t) => `<button type="button" class="themeChoice ${active === t[0] ? "active" : ""}" onclick="selectTheme('${t[0]}')"><div class="themeSwatch" style="background:linear-gradient(135deg,${t[2]},${t[3]})"></div><b>${t[1]}</b><div class="advMeta">${{ romance: "Romántico y cálido", night: "Elegante y nocturno", lavender: "Suave y delicado", sunset: "Atardecer cálido", ocean: "Fresco y sereno", cherry: "Intenso y romántico", emerald: "Natural y equilibrado", coffee: "Tonos tierra acogedores", sakura: "Rosa suave y delicado", royal: "Violeta elegante", forest: "Verde natural", wine: "Clásico y profundo", sky: "Azul claro y limpio", mint: "Fresco y relajante", peach: "Cálido y luminoso", gold: "Dorado suave", plum: "Ciruela sofisticada", midnight: "Oscuro con acentos azules", charcoal: "Minimalista y oscuro", blush: "Rosa empolvado", ice: "Azul hielo", rosewood: "Rosa madera", aurora: "Verde agua sereno", sage: "Verde salvia natural", blueberry: "Azul violeta delicado", terracotta: "Arcilla cálida", butter: "Amarillo crema suave", lagoon: "Turquesa tranquilo", rosegold: "Rosa dorado elegante", porcelain: "Minimalista, limpio y sofisticado", citrus: "Verde cítrico fresco y luminoso", denim: "Azul clásico, sereno y moderno", cinnamon: "Tonos canela cálidos y acogedores", orchid: "Orquídea suave y romántica" }[t[0]] || "Una combinación equilibrada"}</div></button>`).join("")}</div>
 <div class="colorRow"><input id="settingsAccent" type="color" value="${esc(settingsDraft.accent_color || coupleSettings.accent_color || "#e64d78")}" onchange="previewAccent(this.value)"><div><b>Color principal</b><div class="advMeta">Personaliza botones, detalles y acentos.</div></div></div></div>
 <div class="settingsCard"><h3>📸 Fotos de la aplicación</h3><p>Pueden reemplazar la foto principal sin modificar el código.</p>
 <div class="photoSetting"><img id="settingsHomePreview" class="photoPreview" src="pareja.jpeg" alt="Portada"><div><b>Foto de portada</b><div class="advMeta">Es la imagen grande de Inicio.</div><input id="settingsHomePhoto" type="file" accept="image/*" style="margin-top:10px" onchange="uploadCouplePhoto('settingsHomePhoto','home_photo_path')"></div></div>
 <div class="photoSetting"><img id="settingsLogoPreview" class="photoPreview" src="pareja.jpeg" alt="Foto secundaria"><div><b>Foto secundaria</b><div class="advMeta">Podremos usarla en tarjetas, perfil y futuras pantallas.</div><input id="settingsLogoPhoto" type="file" accept="image/*" style="margin-top:10px" onchange="uploadCouplePhoto('settingsLogoPhoto','logo_photo_path')"></div></div>
 <div class="settingsNote">🔒 Las fotos se guardan en el almacenamiento privado de su pareja. No se hacen públicas.</div></div>
 <div class="settingsCard"><h3>✨ Vista de Inicio</h3><p>La portada puede usar su foto actual o la que carguen arriba.</p><div class="settingsActions"><button class="btn primary" onclick="useDefaultCouplePhoto()">↩️ Volver a la foto original</button><button class="btn" onclick="showAdvancedTab('home')">🏠 Ver Inicio</button></div></div>
 <div class="settingsCard"><h3>🔔 Mis recordatorios</h3><p>Elige con cuánta anticipación quieres recibir tus propios avisos de planes.</p><button class="btn" type="button" onclick="openPersonalReminders()">Configurar mis avisos</button></div>
 </div><div id="settingsSaveMsg" class="settingsNote hidden"></div>`
  );
}

function selectTheme(theme) {
  if (!settingsDraft)
    settingsDraft = {
      theme: coupleSettings.theme || "romance",
      accent_color: coupleSettings.accent_color || "#e64d78",
      background_color: coupleSettings.background_color || "#fff7fa",
    };
  const themeAccents = {
    romance: "#e64d78",
    night: "#d78aa7",
    lavender: "#9a78c7",
    sunset: "#d96b48",
    ocean: "#4b8fb4",
    cherry: "#d7265e",
    emerald: "#2f8f73",
    coffee: "#a56a43",
    sakura: "#e58cab",
    royal: "#7255b5",
    forest: "#557a55",
    wine: "#9d3d58",
    sky: "#4c8ec4",
    mint: "#4a9b88",
    peach: "#e58b62",
    gold: "#b48a2d",
    plum: "#8d4f91",
    midnight: "#8ca8ff",
    charcoal: "#d9a7b8",
    blush: "#c95f87",
    ice: "#639eb7",
    rosewood: "#a74d62",
    aurora: "#65a6a4",
    sage: "#64856a",
    blueberry: "#6476c8",
    terracotta: "#b85f48",
    butter: "#a98527",
    lagoon: "#258e95",
    rosegold: "#b76e79",
    porcelain: "#667085",
    citrus: "#718b2e",
    denim: "#477da8",
    cinnamon: "#a45f36",
    orchid: "#9b6aa8",
  };
  settingsDraft.theme = theme;
  settingsDraft.accent_color = themeAccents[theme] || themeAccents.romance;
  const accentInput = $("settingsAccent");
  if (accentInput) accentInput.value = settingsDraft.accent_color;
  document
    .querySelectorAll(".themeChoice")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.getAttribute("onclick")?.includes(`'${theme}'`),
      ),
    );
}

function previewAccent(v) {
  if (!settingsDraft)
    settingsDraft = {
      theme: coupleSettings.theme || "romance",
      accent_color: coupleSettings.accent_color || "#e64d78",
      background_color: coupleSettings.background_color || "#fff7fa",
    };
  settingsDraft.accent_color = v;
}

async function saveSettingsFromUI() {
  const accent =
    $("settingsAccent")?.value ||
    settingsDraft?.accent_color ||
    coupleSettings.accent_color ||
    "#e64d78";
  const theme = settingsDraft?.theme || coupleSettings.theme || "romance";
  const ok = await saveCoupleSettings({
    theme,
    accent_color: accent,
    background_color:
      settingsDraft?.background_color ||
      coupleSettings.background_color ||
      "#fff7fa",
  });
  if (ok) {
    settingsDraft = null;
    await renderSettingsPhotoPreviews();
    renderAdvanced();
    appAlert("✅ Configuración guardada para los dos ❤️");
  }
}

async function useDefaultCouplePhoto() {
  const old = coupleSettings.home_photo_path;
  const ok = await saveCoupleSettings({ home_photo_path: null });
  if (!ok) return;
  if (old) await sb.storage.from("couple-media").remove([old]);
  await renderSettingsPhotoPreviews();
  renderAdvanced();
}
