function setMsg(text, ok = false) {
  $("loginMsg").textContent = text;

  $("loginMsg").style.color = ok ? "#27845b" : "var(--muted)";
}

async function login() {
  try {
    const email = $("email").value.trim().toLowerCase();

    const password = $("password").value;

    if (!email) {
      setMsg("Escribe tu correo ❤️");

      return;
    }

    if (!password) {
      setMsg("Escribe tu contraseña 🔐");

      return;
    }

    if (!sb) {
      setMsg("No se pudo conectar con Supabase. Recarga la página.");

      return;
    }

    setLoginLoading(true);
    setMsg("Estamos preparando todo para ustedes…");

    const { data, error } = await sb.auth.signInWithPassword({
      email: email,

      password: password,
    });

    if (error) {
      setLoginLoading(false);

      console.error(error);

      setMsg("Correo o contraseña incorrectos.");

      return;
    }

    user = data.user;

    // SIGNED_IN también dispara el listener global. El identificador compartido
    // garantiza que el arranque del espacio se ejecute una sola vez.
    if (authSetupUserId === data.user.id) return;
    authSetupUserId = data.user.id;
    document.body.classList.add("auth-pending");
    await setup();
  } catch (err) {
    console.error(err);

    setLoginLoading(false);

    setMsg("Ocurrió un error inesperado.");
  }
}

function setAuthLoaderPhrase() {
  const message = $("authLoaderMessage");
  if (!message) return;
  const options = authLoadingPhrases.filter((x) => x !== lastAuthLoadingPhrase);
  const phrase =
    options[Math.floor(Math.random() * options.length)] ||
    authLoadingPhrases[0];
  lastAuthLoadingPhrase = phrase;
  message.textContent = phrase;
}

async function init() {
  setAuthLoaderPhrase();
  try {
    const configResponse = await fetch("/api/config", {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      credentials: "same-origin",
      signal: AbortSignal.timeout(12000),
    });

    if (!configResponse.ok) {
      throw new Error(
        configResponse.status === 503
          ? "Este entorno no tiene una conexión de pruebas configurada. No se ha conectado a ninguna base de datos."
          : "No se pudo obtener la configuración segura de la aplicación.",
      );
    }

    const runtimeConfig = await configResponse.json();
    if (runtimeConfig.environment === "preview") {
      document.title = "Nuestro Calendario #21 TEST";
      const badge = document.createElement("div");
      badge.className = "testEnvironment";
      badge.textContent = "TEST · Versión de pruebas";
      document.body.prepend(badge);
    }
    if (!runtimeConfig.supabaseUrl || !runtimeConfig.supabaseKey) {
      throw new Error("La configuración de conexión está incompleta.");
    }

    SUPABASE_URL = runtimeConfig.supabaseUrl;
    SUPABASE_KEY = runtimeConfig.supabaseKey;

    if (!window.supabase) {
      throw new Error("No se pudo cargar la conexión. Recarga la página.");
    }

    sb = window.supabase.createClient(
      SUPABASE_URL,

      SUPABASE_KEY,
    );

    $("login").classList.add("hidden");

    $("join").classList.add("hidden");

    $("app").classList.add("hidden");

    sb.auth.onAuthStateChange(async (event, session) => {
      console.log("Supabase Auth:", event);

      if (session && (event === "INITIAL_SESSION" || event === "SIGNED_IN")) {
        user = session.user;
        // SIGNED_IN puede emitirse al volver a una pestaña o renovar el token.
        // Si este usuario ya está configurado, no reactives la pantalla de carga.
        if (authSetupUserId === session.user.id) return;
        setAuthLoaderPhrase();
        document.body.classList.add("auth-pending");
        authSetupUserId = session.user.id;
        setup().catch((err) => {
          authSetupUserId = null;
          console.error("No se pudo restaurar la sesión:", err);
          document.body.classList.remove("auth-pending");
          $("login").classList.remove("hidden");
        });
      } else if (event === "INITIAL_SESSION" && !session) {
        document.body.classList.remove("auth-pending");
        $("login").classList.remove("hidden");
      }

      if (event === "SIGNED_OUT") {
        authSetupUserId = null;
        user = null;

        couple = null;
        spotifyLocalReset();

        plans = [];
        dataLoadRevision++;
        advCache = Object.fromEntries(
          Object.keys(advTables).map((key) => [key, []]),
        );
        adventureChoice = null;
        knowingCategory = "today";
        bondMoodHistoryOpen=false;bondMoodHistoryLimit=30;bondMoreMoodsOpen=false;
        adventureFilter = "all";
        gameMode="menu";gameActiveId=null;gameSolo=null;
        extraSelected=null;
        dreamsGoalsView = "dreams";
        futureFilter = "all";
        weddingFilter = "overview";
        smartMemoryView='list';smartSlideshowIds=[];smartSlideshowIndex=0;memoryFilters={query:'',year:'',favorites:false};
        if($('advModal')?.querySelector('.smartSlideshow,.smartSuggestionList')){$('advModalBody').replaceChildren();$('advModal').classList.remove('show','is-closing');}
        storyFilters = {month:"",kind:"all",query:"",favorites:false,view:"timeline",order:"newest"};
        personalDraft = null;
        photoFrameDraft = null;
        coupleSettings.home_title = null;
        coupleSettings.home_subtitle = null;
        applyPersonalPreferences();
        coupleProfiles = [];
        myProfile = null;
        if (window.advancedRealtime) {
          await sb.removeChannel(window.advancedRealtime);
          window.advancedRealtime = null;
        }
        if (realtimeRefreshTimer) clearTimeout(realtimeRefreshTimer);
        $("advancedContent").replaceChildren();
        mediaUrls.clear();
        settingsPhotoUrls.clear();
        homePhotoApplyToken++;
        delete document.documentElement.dataset.ncHomePhotoPending;
        for (const key of Object.keys(localStorage)) {
          if (
            key.startsWith("nc21_signed_photo_") ||
            key === "nc21_couple_settings"
          )
            localStorage.removeItem(key);
        }
        if (realtimeChannel) {
          await sb.removeChannel(realtimeChannel);

          realtimeChannel = null;
        }

        $("app").classList.add("hidden");

        $("join").classList.add("hidden");

        document.body.classList.remove("auth-pending");
        $("login").classList.remove("hidden");

        $("email").value = "";

        $("password").value = "";

        setMsg("");
      }
    });
  } catch (err) {
    console.error("No se pudo inicializar la aplicación:", err);
    document.body.classList.remove("auth-pending");
    $("login")?.classList.remove("hidden");

    setMsg(err?.message || "No se pudo inicializar la aplicación.");
  }
}

async function setup() {
  if (!user || !sb) return;

  $("userLine").textContent = "Conectado como " + user.email;

  const { data: mem, error } = await sb

    .from("couple_members")

    .select("couple_id,display_name")

    .eq("user_id", user.id)

    .maybeSingle();

  if (error) {
    console.error(error);
    setLoginLoading(false);

    $("login").classList.add("hidden");

    $("join").classList.remove("hidden");

    $("joinMsg").textContent =
      "Hay un problema con el espacio compartido: " + error.message;
    revealAuthDestination();
    return;
  }

  if (mem) {
    couple = {
      id: mem.couple_id,
    };

    await showApp();

    return;
  }

  // La autorización se valida en Supabase. No se identifica al creador
  // mediante un correo personal incluido en el código del navegador.
  const { data: c, error: rpcError } = await sb.rpc("get_or_create_our_couple");

  if (!rpcError && c) {
    couple = c;
    $("joinCode").textContent = c.join_code || "NUESTRO #21";
    $("joinIntro").textContent =
      "Este es el código de invitación de su espacio compartido.";
    setLoginLoading(false);
    $("join").classList.remove("hidden");
    $("login").classList.add("hidden");
    $("joinMsg").textContent =
      "Si es la primera configuración, comparte este código con tu pareja. ❤️";
    revealAuthDestination();
    return;
  }

  console.info(
    "El usuario debe unirse a un espacio existente:",
    rpcError?.message || "Sin espacio disponible",
  );

  $("login").classList.add("hidden");

  $("join").classList.remove("hidden");

  $("joinCode").textContent = "NUESTRO #21";

  $("joinIntro").textContent =
    "Nicolás debe compartir contigo el código de su espacio.";

  $("joinMsg").textContent = "Pega el código cuando lo tengas. ❤️";
  revealAuthDestination();
}

async function logout() {
  // Cerrar cualquier modal/panel antes de cerrar la sesión para que
  // nunca quede un cuadro flotante sobre la pantalla de inicio de sesión.
  closeProfilePanel();
  closeAdvModal();
  closeModal();
  closePlansModal();
  closeDetailModal();

  document
    .querySelectorAll(".modal.show")
    .forEach((m) => m.classList.remove("show"));

  if (sb) {
    await sb.auth.signOut();
  }
}
