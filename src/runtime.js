let SUPABASE_URL = "";
let SUPABASE_KEY = "";

let sb = null;

let user = null;

let couple = null;

let plans = [];

let view = new Date();

let currentPlan = null;

let currentDay = null;

let realtimeChannel = null;

const $ = (id) =>
  id.startsWith("#") || id.startsWith(".")
    ? document.querySelector(id)
    : document.getElementById(id);

const months = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const iso = (d) =>
  d.getFullYear() +
  "-" +
  String(d.getMonth() + 1).padStart(2, "0") +
  "-" +
  String(d.getDate()).padStart(2, "0");

counters();

setInterval(counters, 60000);

/* Evita ejecutar setup más de una vez al restaurar la misma sesión. */
let authSetupUserId = null;

const authLoadingPhrases = [
  "Cada día contigo es mi lugar favorito.",
  "Preparando nuevos recuerdos para los dos.",
  "Nuestro amor también vive en los pequeños detalles.",
  "Un espacio, dos corazones y muchos sueños.",
  "Guardando un rinconcito para nuestra historia.",
  "Que nunca nos falten motivos para sonreír juntos.",
  "Organizando los próximos capítulos de nuestra historia.",
  "Todo listo para seguir construyendo nuestro futuro.",
  "Los mejores planes empiezan cuando estamos juntos.",
  "Cuidando cada recuerdo que hace especial lo nuestro.",
  "Dos caminos, un mismo corazón.",
  "Preparando nuestro pequeño universo.",
];
let lastAuthLoadingPhrase = "";

$("joinBtn").onclick = async () => {
  const code = await appPrompt(
    "Pega aquí el código que le apareció a Nicolás:",
  );

  if (!code) return;

  $("joinMsg").textContent = "Uniendo nuestro espacio…";

  const { data: c, error } = await sb.rpc(
    "join_couple",

    {
      p_join_code: code.trim(),

      p_display_name: "Ana María",
    },
  );

  if (error) {
    console.error(error);

    $("joinMsg").textContent = "No pudimos unirnos: " + error.message;

    return;
  }

  couple = c;

  await showApp();
};

$("recurrenceEnabled")?.addEventListener("change", syncRecurrenceUI);
$("recurrenceType")?.addEventListener("change", syncRecurrenceUI);

$("loginBtn").addEventListener("click", login);

$("registerBtn").addEventListener("click", register);

$("forgotBtn").addEventListener("click", forgotPassword);

$("password").addEventListener(
  "keydown",

  (event) => {
    if (event.key === "Enter") {
      login();
    }
  },
);

$("modal").addEventListener("click", (event) => {
  if (event.target === $("modal")) {
    closeModal();
  }
});

$("plansModal").addEventListener("click", (event) => {
  if (event.target === $("plansModal")) {
    closePlansModal();
  }
});

$("detailModal").addEventListener("click", (event) => {
  if (event.target === $("detailModal")) {
    closeDetailModal();
  }
});

let advancedTab = (function () {
  try {
    return localStorage.getItem("nc21_last_tab") || "home";
  } catch (e) {
    return "home";
  }
})();
let suppressTabAnimation = false;
let animateNextModuleRender = false;
const validAdvancedTabs = new Set([
  "home",
  "calendar",
  "story",
  "memories",
  "letters",
  "dreams",
  "challenges",
  "ideas",
  "dates",
  "goals",
  "budget",
  "notifications",
  "question",
  "places",
  "achievements",
  "private",
  "settings",
]);
if (!validAdvancedTabs.has(advancedTab)) advancedTab = "home";
let advCache = {
  memories: [],
  letters: [],
  dreams: [],
  challenges: [],
  dates: [],
  goals: [],
  places: [],
  ideas: [],
  privateNotes: [],
  expenses: [],
  recurring: [],
  notifications: [],
  dailyAnswers: [],
};
let budgetSelectedMonth =
  new Date().getFullYear() +
  "-" +
  String(new Date().getMonth() + 1).padStart(2, "0");
const advTables = {
  memories: "memories",
  letters: "love_letters",
  dreams: "dreams",
  challenges: "challenges",
  dates: "important_dates",
  goals: "goals",
  places: "places",
  ideas: "activity_ideas",
  privateNotes: "private_notes",
  expenses: "shared_expenses",
  recurring: "budget_recurring_templates",
  notifications: "notifications",
  dailyAnswers: "daily_answers",
};

const cachedCoupleSettings = window.__nc21ThemeBoot || {};
let coupleSettings = {
  theme: cachedCoupleSettings.theme || "romance",
  accent_color: cachedCoupleSettings.accent_color || "#e64d78",
  background_color: cachedCoupleSettings.background_color || "#fff7fa",
  home_photo_path: cachedCoupleSettings.home_photo_path || null,
  logo_photo_path: cachedCoupleSettings.logo_photo_path || null,
};
let settingsDraft = null;

let homePhotoApplyToken = 0;

let homePhotoCropState = null;

const dailyQuestionBank = [
  "¿Cuál es un recuerdo conmigo que te hace sonreír de inmediato?",
  "¿Qué plan sencillo te gustaría que hiciéramos esta semana?",
  "¿En qué momento te has sentido más amado/a por mí?",
  "¿Qué lugar sueñas con conocer juntos?",
  "¿Qué pequeña costumbre nuestra te gustaría conservar siempre?",
  "¿Qué canción te recuerda a nosotros y por qué?",
  "¿Qué te gustaría que celebráramos más a menudo?",
  "¿Qué aprendiste de ti desde que estamos juntos?",
  "¿Cuál sería para ti una cita perfecta sin importar el dinero?",
  "¿Qué detalle pequeño te hace sentir especial?",
  "¿Qué sueño personal quisieras que yo apoyara más?",
  "¿Qué te gustaría aprender conmigo?",
  "¿Qué comida te gustaría que preparáramos juntos?",
  "¿Qué tradición te gustaría crear como pareja?",
  "¿Qué momento difícil sientes que superamos como equipo?",
  "¿Qué te da paz cuando estamos juntos?",
  "¿Qué aventura te gustaría vivir antes de terminar el año?",
  "¿Qué valor quieres que nunca falte en nuestro hogar?",
  "¿Qué parte de nuestra historia te gustaría contar en el futuro?",
  "¿Qué agradeces de nuestra relación hoy?",
  "¿Qué hábito bonito podríamos empezar juntos?",
  "¿Qué te gustaría que hiciéramos cuando uno de los dos tenga un día difícil?",
  "¿Qué te gustaría que nunca dejáramos de decirnos?",
  "¿Cuál es una meta que te emociona construir conmigo?",
  "¿Qué significa para ti amar con paciencia?",
  "¿Qué detalle de nuestra primera etapa recuerdas con cariño?",
  "¿Qué te gustaría hacer en nuestro próximo aniversario?",
  "¿Qué te hace sentir que somos un equipo?",
  "¿Qué actividad nueva probarías conmigo?",
  "¿Qué quisieras que recordáramos de este año?",
];

const PUSH_VAPID_PUBLIC_KEY =
  "BB0iqrnyRyEHM5I3OVVs5ZmRiDvDHkqHfGha7wG9QcqaGmpR4jO3KBxtQjQZ99sMjbPLjDX8bqrvzsTNI_xlumI";

let deferredInstallPrompt = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
});

let advancedEditState = { key: null, id: null };

let myProfile = { user_id: null, display_name: "", avatar_path: null, bio: "" };
let coupleProfiles = [];

/* Sincronización Realtime: recrea canales por pareja, informa estados y agrupa cambios simultáneos. */
let plansRealtimeCoupleId = null;
let plansRealtimeStatus = "CLOSED";
let advancedRealtimeCoupleId = null;
let advancedRealtimeStatus = "CLOSED";
let realtimeRefreshTimer = null;
let realtimeRefreshPlans = false;
let realtimeRefreshBusy = false;
let realtimeRefreshAgain = false;

/* Al volver a primer plano, refresca datos y recupera canales que hayan quedado desconectados. */

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refreshRealtimeOnResume();
});
window.addEventListener("pageshow", () => refreshRealtimeOnResume());

$("advModal")?.addEventListener("click", (e) => {
  if (e.target === $("advModal")) closeAdvModal();
});
$("profileModal")?.addEventListener("click", (e) => {
  if (e.target === $("profileModal")) closeProfilePanel();
});

/* Exponer acciones a los botones HTML y evitar problemas de alcance en navegadores */

// Conserva la pestaña elegida al volver al navegador y evita animaciones que parpadeen al reanudar.
window.addEventListener("pagehide", () => {
  try {
    localStorage.setItem("nc21_last_tab", advancedTab);
  } catch (e) {}
});
let lastResumeRestoreAt = 0;

window.addEventListener("pageshow", restoreLastTabOnResume);
document.addEventListener("visibilitychange", restoreLastTabOnResume);

Object.assign(window, {
  showAdvancedTab,
  openQuickCreate,
  openMemoryForm,
  openLetterForm,
  openDreamForm,
  openChallengeForm,
  openDateForm,
  openGoalForm,
  openPlaceForm,
  openIdeaForm,
  openPrivateForm,
  openAdvancedEdit,
  saveAdvancedEdit,
  saveMemory,
  saveLetter,
  saveDream,
  saveChallenge,
  saveDate,
  saveGoal,
  savePlace,
  saveIdea,
  savePrivate,
  deleteAdvanced,
  toggleFavorite,
  setDreamStatus,
  toggleChallenge,
  toggleGoal,
  advanceGoal,
  randomIdea,
  selectTheme,
  previewAccent,
  saveSettingsFromUI,
  useDefaultCouplePhoto,
  uploadCouplePhoto,
  openProfilePanel,
  closeProfilePanel,
  saveMyProfile,
  changePassword,
  openMemoryPhoto,
  closeMemoryPhoto,
  openExpenseForm,
  saveExpense,
  deleteExpense,
  changeBudgetMonth,
  setBudgetMonth,
  openRecurringForm,
  saveRecurringTemplate,
  toggleRecurringTemplate,
  saveDailyAnswer,
  markNotificationRead,
  markAllNotificationsRead,
  openNotificationTarget,
  enableBrowserNotifications,
  installCalendarApp,
});

let ncTransactionDepth = 0;
let ncTransactionIndicator = null;

const ncSavingActions = [
  "savePlan",
  "saveDailyAnswer",
  "saveExpense",
  "saveRecurringTemplate",
  "saveGoalMovement",
  "saveMemory",
  "saveLetter",
  "saveDream",
  "saveChallenge",
  "saveDate",
  "saveGoal",
  "savePlace",
  "saveIdea",
  "savePrivate",
  "saveAdvancedEdit",
  "saveMyProfile",
  "saveSettingsFromUI",
  "saveHomePhotoCrop",
  "uploadCouplePhoto",
  "useDefaultCouplePhoto",
  "confirmDeleteExpense",
  "toggleFavorite",
  "setDreamStatus",
  "toggleChallenge",
  "toggleGoal",
  "toggleRecurringTemplate",
  "markNotificationRead",
  "markAllNotificationsRead",
  "changePassword",
];
ncSavingActions.forEach((name) => {
  if (typeof window[name] === "function")
    window[name] = withTransactionIndicator(window[name]);
});

if ("serviceWorker" in navigator)
  navigator.serviceWorker.register("/sw.js").catch(() => {});

window.addEventListener("error", (e) => {
  console.error("Nuestro Calendario #21:", e.error || e.message);
});

window.addEventListener("load", init);
window.addEventListener("focus", checkLocalReminders);
setInterval(checkLocalReminders, 60000);

let appDialogResolver = null,
  appDialogMode = "alert";

let dataLoadRevision = 0;
let pendingModuleRender = false;

let pendingDeepLink = new URLSearchParams(location.search);

document.addEventListener("focusout", () =>
  setTimeout(() => {
    if (
      pendingModuleRender &&
      !document.activeElement?.closest(
        "#advancedContent input, #advancedContent textarea, #advancedContent select",
      )
    ) {
      pendingModuleRender = false;
      renderAdvanced({ preserveInputs: true });
    }
  }, 0),
);
