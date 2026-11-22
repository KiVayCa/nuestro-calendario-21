function showAppToast(message, type = "success") {
  let toast = $("appToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "appToast";
    toast.className = "appToast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }
  toast.className =
    "appToast " + (type === "error" ? "toastError" : "toastSuccess");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.nc21ToastTimer);
  window.nc21ToastTimer = setTimeout(
    () => toast.classList.remove("show"),
    3200,
  );
}

function showTransactionIndicator() {
  ncTransactionDepth++;
  if (ncTransactionIndicator) return;
  const indicator = document.createElement("div");
  indicator.className = "ncTransactionIndicator";
  indicator.setAttribute("role", "status");
  indicator.setAttribute("aria-label", "Procesando");
  indicator.innerHTML =
    '<div class="ncTransactionContent"><div class="ncTransactionHeartScene" aria-hidden="true"><div class="authLoaderHeart">♥</div><div class="authLoaderOrbits"><span></span><span></span><span></span></div></div><span class="ncTransactionLabel">Procesando<span class="ncTransactionDots" aria-hidden="true">...</span></span></div>';
  document.body.appendChild(indicator);
  ncTransactionIndicator = indicator;
}

function hideTransactionIndicator() {
  ncTransactionDepth = Math.max(0, ncTransactionDepth - 1);
  if (ncTransactionDepth || !ncTransactionIndicator) return;
  const indicator = ncTransactionIndicator;
  ncTransactionIndicator = null;
  indicator.classList.add("is-hiding");
  window.setTimeout(() => indicator.remove(), 150);
}

function withTransactionIndicator(action) {
  if (typeof action !== "function") return action;
  let inFlight = null;
  return function (...args) {
    if (inFlight) return inFlight;
    showTransactionIndicator();
    inFlight = Promise.resolve()
      .then(() => action.apply(this, args))
      .finally(() => {
        inFlight = null;
        hideTransactionIndicator();
      });
    return inFlight;
  };
}

function appDialogClose(value) {
  const el = $("appDialog");
  if (!el) return;
  if (!el.classList.contains("show")) return;
  el.classList.add("is-closing");
  window.setTimeout(() => {
    if (el.classList.contains("is-closing"))
      el.classList.remove("show", "is-closing");
  }, 210);
  const resolve = appDialogResolver;
  appDialogResolver = null;
  if (resolve) resolve(value);
}

function appDialogSubmit() {
  if (appDialogMode === "prompt") {
    const input = $("appDialogInput");
    const value = input?.value ?? "";
    appDialogClose(value);
  } else if (appDialogMode === "confirm") {
    appDialogClose(true);
  } else appDialogClose(true);
}

function appDialogOpen({
  title = "Nuestro espacio ❤️",
  message = "",
  mode = "alert",
  label = "Continuar ❤️",
  inputLabel = "Respuesta",
  defaultValue = "",
  placeholder = "",
  icon = "♡",
  danger = false,
}) {
  return new Promise((resolve) => {
    if (appDialogResolver) appDialogClose(null);
    $("appDialog").classList.remove("is-closing");
    appDialogResolver = resolve;
    appDialogMode = mode;
    $("appDialogTitle").textContent = title;
    $("appDialogMessage").textContent = String(message ?? "");
    $("appDialogIcon").textContent = icon;
    $("appDialogInputWrap").hidden = mode !== "prompt";
    $("appDialogInputLabel").textContent = inputLabel;
    $("appDialogInput").value = defaultValue;
    $("appDialogInput").placeholder = placeholder;
    $("appDialogError").hidden = true;
    $("appDialogCancel").hidden = mode === "alert";
    $("appDialogOk").textContent = label;
    $("appDialogOk").className = "btn " + (danger ? "danger" : "primary");
    $("appDialog").classList.add("show");
    requestAnimationFrame(() => {
      if (!$("appDialog").classList.contains("show") || $("appDialog").classList.contains("is-closing")) return;
      if (mode === "prompt") $("appDialogTitle").focus({ preventScroll: true });
      else $("appDialogOk").focus({ preventScroll: true });
    });
  });
}

function appAlert(message, title = "Nuestro espacio ❤️") {
  return appDialogOpen({
    title,
    message,
    mode: "alert",
    label: "Entendido ❤️",
    icon: "💗",
  });
}

function appConfirm(message, title = "¿Confirmamos?", danger = true) {
  return appDialogOpen({
    title,
    message,
    mode: "confirm",
    label: danger ? "Sí, continuar" : "Confirmar ❤️",
    icon: danger ? "🩷" : "💗",
    danger,
  });
}

function appPrompt(
  message,
  title = "Un dato para nosotros",
  defaultValue = "",
  inputLabel = "Respuesta",
  placeholder = "",
) {
  return appDialogOpen({
    title,
    message,
    mode: "prompt",
    label: "Guardar ❤️",
    inputLabel,
    defaultValue,
    placeholder,
    icon: "💌",
  });
}
