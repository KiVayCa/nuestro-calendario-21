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
  return `<div class="settingsCard" style="margin-bottom:16px"><h3>💚 Aplicación Android y widgets</h3><p>Descarga la última versión de Nuestro Calendario #21. Incluye los widgets y el aviso de nuevas actualizaciones.${nativeAndroidCode > 0 ? ` Versión instalada: <b>${esc(nativeAndroidName || nativeAndroidCode)}</b>.` : ""}</p><button class="btn primary" type="button" onclick="openAndroidDownloads()">${nativeAndroidCode > 0 ? "Versión y actualizaciones" : "Descargar APK para Android"}</button><p class="advMeta">Instala como actualización, sin desinstalar la versión anterior, para conservar tu sesión y tus widgets.</p></div>`;
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
    container.innerHTML = `<p><b>${current ? "Tienes una versión actualizada" : "Última versión disponible"}: ${esc(release.versionName)}</b></p><p>${esc((release.bytes / 1048576).toFixed(1))} MB · ${esc(new Date(release.publishedAt).toLocaleDateString("es-CO"))}</p><ul>${release.notes.map((note) => `<li>${esc(note)}</li>`).join("")}</ul><div class="advActions">${nativeAndroidCode > 0 ? '<a class="btn primary" href="calendario21://updates">Buscar e instalar desde Android</a>' : ""}<a class="btn" href="${esc(release.apkUrl)}?download=1" download="NuestroCalendario21.apk" rel="noopener">Descargar archivo APK</a></div><p class="advMeta">Android te pedirá confirmar la instalación. La primera vez puede solicitar permiso para instalar desde el navegador o desde Nuestro Calendario #21.</p>`;
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
    if (check !== androidForegroundCheck || document.visibilityState === "hidden") return;
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
    banner.style.cssText =
      "position:fixed;top:calc(env(safe-area-inset-top,0px) + 12px);right:12px;left:12px;margin:auto;max-width:420px;padding:18px;border-radius:20px;background:var(--card,#fff);color:var(--ink,#35262b);border:1px solid var(--line,#efdee4);box-shadow:0 14px 45px #0004;z-index:12000";
    banner.innerHTML = `<b>💚 Hay una actualización Android</b><p>Ya está disponible ${esc(release.versionName)}.</p><div class="advActions"><a class="btn primary" href="calendario21://updates">Actualizar</a><button class="btn" type="button" data-dismiss-android>Más tarde</button></div>`;
    banner.querySelector("[data-dismiss-android]").onclick = () => {
      androidReleaseDismissed = release.versionCode;
      banner.remove();
    };
    document.body.appendChild(banner);
  } catch {
    if (check === androidForegroundCheck && document.visibilityState !== "hidden")
      showAppToast("No pudimos comprobar las actualizaciones. Revisa tu conexión.", "error");
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
