// APK installation is offered on Android; only the native wrapper supplies its installed version.
const nativeAndroidParams = new URLSearchParams(location.search);
const nativeAndroidCode = /Android/i.test(navigator.userAgent || "")
  ? Number(nativeAndroidParams.get("ncAndroidVersion") || 0)
  : 0;
const nativeAndroidName = nativeAndroidParams.get("ncAndroidName") || "";
let androidReleaseRequest = null;
let androidForegroundCheck = 0;
let androidReleaseDismissed = 0;

function androidDevice() {
  return /Android/i.test(navigator.userAgent || "");
}

function validateAndroidRelease(value) {
  let url;
  try {
    url = new URL(value?.apkUrl);
  } catch {
    return null;
  }
  if (
    value?.format !== 1 ||
    value.packageName !== "co.calendario21.app" ||
    !Number.isSafeInteger(value.versionCode) ||
    value.versionCode < 1 ||
    typeof value.versionName !== "string" ||
    value.versionName.length > 80 ||
    !/^[a-f0-9]{64}$/.test(value.sha256 || "") ||
    !Number.isSafeInteger(value.bytes) ||
    value.bytes < 1024 ||
    value.bytes > 50 * 1024 * 1024 ||
    url.protocol !== "https:" ||
    url.hostname !== "vz4dp1vu2kie6kny.public.blob.vercel-storage.com" ||
    url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !==
      `/android/nuestro-calendario-21-v${value.versionCode}.apk` ||
    !Array.isArray(value.notes) ||
    value.notes.length > 12 ||
    value.notes.some((note) => typeof note !== "string" || note.length > 500)
  )
    return null;
  return value;
}

async function fetchAndroidRelease() {
  if (androidReleaseRequest) return androidReleaseRequest;
  androidReleaseRequest = (async () => {
    const response = await fetch("/android-release.json", {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) throw new Error("Actualización no disponible");
    const body = await response.text();
    if (body.length > 32768) throw new Error("Información de versión inválida");
    const release = validateAndroidRelease(JSON.parse(body));
    if (!release) throw new Error("Información de versión inválida");
    return release;
  })();
  try {
    return await androidReleaseRequest;
  } finally {
    androidReleaseRequest = null;
  }
}

function androidInstallCard() {
  if (!androidDevice()) return "";
  return `<div class="settingsCard" style="margin-bottom:16px"><h3>💚 Aplicación Android y widgets</h3><p>Descarga la última versión de Nuestro Calendario #21. Incluye los widgets y el aviso de nuevas actualizaciones.${nativeAndroidCode > 0 ? ` Versión instalada: <b>${esc(nativeAndroidName || nativeAndroidCode)}</b>.` : ""}</p><button class="btn primary" type="button" onclick="openAndroidDownloads()">${nativeAndroidCode > 0 ? "Versión y actualizaciones" : "Descargar APK para Android"}</button>${nativeAndroidCode >= 8 ? '<div class="advActions"><a class="btn" href="calendario21://push-link">Vincular este teléfono para avisos</a><button class="btn" onclick="openAndroidPushDevices()">Ver teléfonos vinculados</button></div>' : ""}<p class="advMeta">Instala como actualización, sin desinstalar la versión anterior, para conservar tu sesión y tus widgets.</p></div>`;
}

async function openAndroidDownloads() {
  if (!androidDevice()) return;
  openAdvModal(
    "Aplicación Android",
    '<div id="androidReleaseDetails" role="status">Buscando la última versión…</div>',
  );
  const container = $("androidReleaseDetails");
  try {
    const release = await fetchAndroidRelease();
    if (!container?.isConnected) return;
    const current =
      nativeAndroidCode > 0 && nativeAndroidCode >= release.versionCode;
    container.innerHTML = `<p><b>${current ? "Tienes una versión actualizada" : "Última versión disponible"}: ${esc(release.versionName)}</b></p><p>${esc((release.bytes / 1048576).toFixed(1))} MB · ${esc(new Date(release.publishedAt).toLocaleDateString("es-CO"))}</p><ul>${release.notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul><div class="advActions">${nativeAndroidCode > 0 && nativeAndroidCode < 9 ? '<a class="btn primary" href="calendario21://updates">Buscar e instalar desde Android</a>' : ""}<a class="btn" href="${esc(release.apkUrl)}?download=1" download="NuestroCalendario21.apk" rel="noopener">Descargar archivo APK</a></div><p class="advMeta">Android te pedirá confirmar la instalación. La primera vez puede solicitar permiso para instalar desde ${nativeAndroidCode >= 9 ? "el navegador" : "el navegador o desde Nuestro Calendario #21"}.</p>`;
  } catch {
    if (container?.isConnected)
      container.innerHTML =
        '<p>No pudimos comprobar la versión. Revisa tu conexión e inténtalo de nuevo.</p><button class="btn" onclick="openAndroidDownloads()">Volver a intentar</button>';
  }
}

async function checkAndroidAppUpdate() {
  if (
    !androidDevice() ||
    !Number.isSafeInteger(nativeAndroidCode) ||
    nativeAndroidCode < 1 ||
    document.visibilityState === "hidden"
  )
    return;
  const check = ++androidForegroundCheck;
  try {
    const release = await fetchAndroidRelease();
    if (
      check !== androidForegroundCheck ||
      document.visibilityState === "hidden"
    )
      return;
    if (release.versionCode === nativeAndroidCode) {
      $("androidUpdateNotice")?.remove();
      showAppToast("Ya tienes la última versión de Nuestro Calendario #21.");
      return;
    }
    if (
      release.versionCode < nativeAndroidCode ||
      release.versionCode === androidReleaseDismissed ||
      $("androidUpdateNotice")
    )
      return;
    const banner = document.createElement("aside");
    banner.id = "androidUpdateNotice";
    banner.setAttribute("role", "status");
    banner.innerHTML = `<b>💚 Hay una actualización Android</b><p>Ya está disponible ${esc(release.versionName)}.</p><div class="advActions">${nativeAndroidCode >= 9 ? '<button class="btn primary" type="button" onclick="openAndroidDownloads()">Actualizar</button>' : '<a class="btn primary" href="calendario21://updates">Actualizar</a>'}<button class="btn" type="button" data-dismiss-android>Más tarde</button></div>`;
    banner.querySelector("[data-dismiss-android]").onclick = () => {
      androidReleaseDismissed = release.versionCode;
      banner.remove();
    };
    document.body.appendChild(banner);
  } catch {
    if (
      check === androidForegroundCheck &&
      document.visibilityState !== "hidden"
    )
      showAppToast(
        "No pudimos comprobar las actualizaciones. Revisa tu conexión.",
        "error",
      );
  }
}

window.addEventListener("load", checkAndroidAppUpdate);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    androidForegroundCheck++;
    androidReleaseDismissed = 0;
  } else {
    checkAndroidAppUpdate();
  }
});

const pushLinkChallenge = nativeAndroidParams.get("push_challenge") || "";
const pushLinkState = nativeAndroidParams.get("push_state") || "";
let pushLinkOffered = false;

function maybeOfferAndroidPushLink() {
  if (
    pushLinkOffered ||
    nativeAndroidCode < 8 ||
    !user?.id ||
    !couple?.id ||
    !/^[a-f0-9]{64}$/.test(pushLinkChallenge) ||
    !/^[a-f0-9]{32}$/.test(pushLinkState)
  )
    return false;
  pushLinkOffered = true;
  const cleanUrl = new URL(location.href);
  cleanUrl.searchParams.delete("push_challenge");
  cleanUrl.searchParams.delete("push_state");
  history.replaceState(null, "", cleanUrl.href);
  openAdvModal(
    "Vincular este teléfono",
    '<div id="pushLinkResult"><p>Vincula este teléfono con tu cuenta para abrir el calendario al tocar un aviso.</p><button class="btn primary" onclick="confirmAndroidPushLink(this)">Vincular con esta cuenta</button></div>',
  );
  return true;
}

async function confirmAndroidPushLink(button) {
  const account = user?.id,
    space = couple?.id,
    node = $("pushLinkResult");
  if (!account || !space || !node || button.disabled) return;
  button.disabled = true;
  try {
    const { data: code, error } = await sb.rpc(
      "create_android_push_pair_code",
      {
        p_couple_id: space,
        p_challenge: pushLinkChallenge,
        p_state: pushLinkState,
      },
    );
    if (account !== user?.id || space !== couple?.id || !node.isConnected)
      return;
    if (error || !/^[a-f0-9]{64}$/.test(code || "")) throw new Error();
    const link = `calendario21://push-link?code=${code}&state=${pushLinkState}`;
    node.innerHTML = `<a class="btn primary" href="${esc(link)}">Terminar en Android</a>`;
  } catch {
    if (node.isConnected)
      appAlert("No pudimos preparar el vínculo. Vuelve a intentarlo.");
    button.disabled = false;
  }
}

async function openAndroidPushDevices() {
  const account = user?.id;
  if (!account) return;
  openAdvModal(
    "Teléfonos vinculados para avisos",
    '<div id="androidPushDevices" role="status">Cargando…</div>',
  );
  const node = $("androidPushDevices");
  const { data, error } = await sb
    .from("android_push_devices")
    .select("id,expires_at,display_name")
    .eq("user_id", account)
    .order("expires_at", { ascending: false });
  if (!node?.isConnected || user?.id !== account) return;
  if (error || !data.length) {
    node.textContent = error
      ? "No pudimos cargar los teléfonos."
      : "Aún no hay teléfonos vinculados.";
    return;
  }
  node.replaceChildren();
  for (const [index, device] of data.entries()) {
    const row = document.createElement("div");
    const name = document.createElement("strong");
    const defaultName = "Teléfono " + (index + 1);
    name.textContent = device.display_name || defaultName;
    const expiry = document.createElement("span");
    const date = new Date(device.expires_at);
    expiry.textContent =
      (date > new Date() ? " · Vence el " : " · Venció el ") +
      date.toLocaleDateString("es-CO");
    const rename = document.createElement("button");
    rename.className = "btn";
    rename.textContent = "Cambiar nombre";
    const edit = document.createElement("form");
    edit.className = "advActions";
    edit.hidden = true;
    edit.style.display = "none";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 60;
    input.placeholder = "Mi Motorola";
    input.setAttribute("aria-label", "Nombre del teléfono");
    const save = document.createElement("button");
    save.className = "btn primary";
    save.textContent = "Guardar";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "btn";
    cancel.textContent = "Cancelar";
    const status = document.createElement("span");
    status.setAttribute("role", "status");
    const toggleEdit = (open) => {
      edit.hidden = !open;
      edit.style.display = open ? "" : "none";
      rename.disabled = open;
      status.textContent = "";
      if (open) {
        input.value = device.display_name || "";
        input.focus();
      } else {
        rename.focus();
      }
    };
    rename.onclick = () => toggleEdit(true);
    cancel.onclick = () => toggleEdit(false);
    edit.onsubmit = async (event) => {
      event.preventDefault();
      if (save.disabled || user?.id !== account) return;
      const label = input.value.trim();
      save.disabled = input.disabled = cancel.disabled = true;
      status.textContent = "Guardando…";
      try {
        const { data: saved, error } = await sb.rpc(
          "rename_android_push_device",
          {
            p_id: device.id,
            p_name: label,
          },
        );
        if (user?.id !== account || !row.isConnected) return;
        if (error || saved !== true) throw new Error();
        device.display_name = label;
        name.textContent = label || defaultName;
        toggleEdit(false);
        showAppToast("Nombre guardado.");
      } catch {
        status.textContent =
          "No pudimos guardar el nombre. Inténtalo de nuevo.";
      } finally {
        save.disabled = input.disabled = cancel.disabled = false;
      }
    };
    edit.append(input, save, cancel, status);
    const button = document.createElement("button");
    button.className = "btn";
    button.textContent = "Desvincular";
    button.onclick = async () => {
      if (user?.id !== account) return;
      button.disabled = true;
      const { error } = await sb
        .from("android_push_devices")
        .delete()
        .eq("id", device.id)
        .eq("user_id", account);
      if (error) {
        button.disabled = false;
        appAlert("No pudimos desvincular el teléfono.");
      } else {
        row.remove();
        if (!node.childElementCount)
          node.textContent = "Aún no hay teléfonos vinculados.";
      }
    };
    row.append(
      name,
      expiry,
      document.createTextNode(" "),
      rename,
      document.createTextNode(" "),
      button,
    );
    row.append(edit);
    node.append(row);
  }
}
