const widgetLinkParams = new URLSearchParams(location.search);
let widgetLinkOffered = false;

function validWidgetLinkRequest() {
  return (
    androidDevice() &&
    nativeAndroidCode >= 4 &&
    /^[a-f0-9]{64}$/.test(widgetLinkParams.get("widget_challenge") || "") &&
    /^[a-f0-9]{32}$/.test(widgetLinkParams.get("widget_state") || "")
  );
}

let nativeWidgetRequest = null;
window.addEventListener("message", event => {
  if (window !== window.top || event.origin !== location.origin || !event.ports[0] ||
      typeof event.data !== "string") return;
  let message;
  try { message = JSON.parse(event.data); } catch { return; }
  if (message?.type !== "nc21-widget-link" || !/^[a-f0-9]{64}$/.test(message.challenge) ||
      !/^[a-f0-9]{32}$/.test(message.state)) return;
  nativeWidgetRequest = { ...message, port: event.ports[0] };
  completeNativeWidgetLink();
});

async function completeNativeWidgetLink() {
  const request = nativeWidgetRequest;
  if (!request || request.busy || !user?.id || !couple?.id) return;
  const account = user.id, space = couple.id;
  request.busy = true;
  try {
    const {data, error} = await sb.rpc("create_widget_pair_code", {
      p_couple_id: space, p_challenge: request.challenge, p_state: request.state
    });
    if (!error && /^[a-f0-9]{64}$/.test(data) && user?.id === account &&
        couple?.id === space && request === nativeWidgetRequest) {
      request.port.postMessage(JSON.stringify({code: data, state: request.state}));
      nativeWidgetRequest = null;
    }
  } catch { /* A later signed-in refresh can retry while the channel is open. */ }
  finally { request.busy = false; }
}

function maybeOfferWidgetLink() {
  completeNativeWidgetLink();
  if (
    widgetLinkOffered ||
    !user?.id ||
    !couple?.id ||
    !validWidgetLinkRequest()
  )
    return;
  widgetLinkOffered = true;
  openAdvModal(
    "Vincular tus widgets ♡",
    `<div id="widgetLinkResult"><p>Usaremos la cuenta que ya tienes abierta para mostrar sus planes, fechas y tema en los widgets de este celular.</p><p class="advMeta">El permiso es solo de lectura y se puede revocar desde Configuración. No se comparte tu contraseña ni la sesión de acceso.</p><button class="btn primary" type="button" onclick="createWidgetLink(this)">Vincular con esta cuenta</button></div>`,
  );
}

async function createWidgetLink(button) {
  if (!user?.id || !couple?.id || !validWidgetLinkRequest() || button?.disabled)
    return;
  const account = user.id,
    space = couple.id;
  const target = $("widgetLinkResult");
  if (button) button.disabled = true;
  try {
    const { data: code, error } = await sb.rpc("create_widget_pair_code", {
      p_couple_id: space,
      p_challenge: widgetLinkParams.get("widget_challenge"),
      p_state: widgetLinkParams.get("widget_state"),
    });
    if (!target?.isConnected || user?.id !== account || couple?.id !== space)
      return;
    if (error || !/^[a-f0-9]{64}$/.test(code || ""))
      throw new Error("Link unavailable");
    const url = `calendario21://widget-link?code=${code}&state=${widgetLinkParams.get("widget_state")}`;
    target.innerHTML = `<p>Ya está listo. Confirma el vínculo en Android para actualizar tus widgets.</p><a class="btn primary" href="${esc(url)}">Continuar en Android</a><p class="advMeta">Este vínculo funciona una sola vez, en este celular, y vence en 90 segundos.</p>`;
    setTimeout(() => {
      if (target.isConnected && user?.id === account && couple?.id === space)
        target.innerHTML =
          '<p>El vínculo venció. Vuelve a generarlo para continuar.</p><button class="btn" onclick="createWidgetLink(this)">Generar otro vínculo</button>';
    }, 90000);
  } catch {
    if (target?.isConnected)
      target.innerHTML =
        '<p>No pudimos generar el vínculo. Revisa tu conexión e inténtalo de nuevo.</p><button class="btn" onclick="createWidgetLink(this)">Volver a intentar</button>';
  }
}

function widgetDevicesCard() {
  return '<div class="settingsCard" style="margin-bottom:16px"><h3>🔗 Widgets vinculados</h3><p>En Android v5 se conectan al abrir la app con tu cuenta. En versiones anteriores puedes vincularlos desde ⚙. Se sincronizan automáticamente y pueden usar el mismo tema de la app.</p><button class="btn" onclick="openWidgetDevices()">Ver dispositivos y permisos</button></div>';
}

async function openWidgetDevices() {
  openAdvModal(
    "Dispositivos con widgets",
    '<div id="widgetDevicesList" role="status">Cargando permisos…</div>',
  );
  const node = $("widgetDevicesList"),
    account = user?.id;
  if (!account) return;
  const { data, error } = await sb
    .from("widget_devices")
    .select("id,created_at,expires_at,last_seen_at")
    .eq("user_id", account)
    .order("created_at", { ascending: false });
  if (!node?.isConnected || account !== user?.id) return;
  if (error) {
    node.textContent =
      "No pudimos cargar los dispositivos. Inténtalo de nuevo.";
    return;
  }
  node.innerHTML = data.length
    ? data
        .map(
          (device) =>
            `<div class="advItem"><div><b>Widgets Android</b><p>Vinculado: ${esc(new Date(device.created_at).toLocaleString("es-CO"))}</p><p class="advMeta">Última sincronización: ${device.last_seen_at ? esc(new Date(device.last_seen_at).toLocaleString("es-CO")) : "pendiente"}. Permiso hasta ${esc(new Date(device.expires_at).toLocaleDateString("es-CO"))}.</p></div><button class="btn danger" type="button" data-device="${esc(device.id)}" onclick="revokeWidgetDevice(this)">Desvincular</button></div>`,
        )
        .join("")
    : "<p>No hay permisos de widgets vinculados con esta cuenta. Las conexiones antiguas con correo se desconectan desde ⚙ en el propio widget.</p>";
}

async function revokeWidgetDevice(button) {
  const id = button?.dataset.device;
  if (!id || button.disabled || !user?.id) return;
  button.disabled = true;
  const { error } = await sb
    .from("widget_devices")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    button.disabled = false;
    return appAlert("No pudimos desvincular ese dispositivo.");
  }
  await openWidgetDevices();
  showAppToast(
    "Permiso revocado. El dispositivo lo comprobará al sincronizar.",
  );
}
