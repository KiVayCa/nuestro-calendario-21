function showAdvancedTab(tab, options = {}) {
  if (!validAdvancedTabs.has(tab)) tab = "home";
  const area = $("advancedArea"),
    content = $("advancedContent"),
    workspace = document.querySelector(".workspace"),
    hero = document.querySelector(".hero"),
    cards = document.querySelector(".cards");
  const previousTab = advancedTab;
  advancedTab = tab;
  animateNextModuleRender =
    previousTab !== tab &&
    !suppressTabAnimation &&
    !document.body.classList.contains("nc-resume-no-flash");
  try {
    localStorage.setItem("nc21_last_tab", tab);
  } catch (e) {}
  document
    .querySelectorAll(".advTab")
    .forEach((b) =>
      b.classList.toggle(
        "active",
        b.getAttribute("onclick")?.includes("'" + tab + "'"),
      ),
    );
  const activeNavButton = Array.from(document.querySelectorAll(".advTab")).find(
    (b) => b.getAttribute("onclick")?.includes("'" + tab + "'"),
  );
  if (activeNavButton) {
    const nav = $("advancedNav");
    if (nav && window.matchMedia("(max-width: 800px)").matches) {
      const targetLeft =
        activeNavButton.offsetLeft -
        nav.offsetLeft -
        (nav.clientWidth - activeNavButton.clientWidth) / 2;
      nav.scrollTo({
        left: Math.max(0, targetLeft),
        behavior: options.skipScroll ? "auto" : "smooth",
      });
    }
  }
  const notificationBell = $("notificationsTab");
  if (notificationBell)
    notificationBell.classList.toggle("active", tab === "notifications");
  if (tab === "calendar") {
    area.classList.add("calendar-mode");
    content.innerHTML = "";
    if (workspace) workspace.classList.remove("tab-hidden", "appTabHidden");
    if (hero) hero.classList.add("appTabHidden");
    if (cards) cards.classList.add("appTabHidden");
    if (!options.skipScroll)
      setTimeout(
        () => workspace?.scrollIntoView({ behavior: "smooth", block: "start" }),
        40,
      );
  } else {
    area.classList.remove("calendar-mode");
    if (workspace) workspace.classList.add("tab-hidden");
    if (hero) hero.classList.add("appTabHidden");
    if (cards) cards.classList.add("appTabHidden");
    renderAdvanced();
    if (!options.skipScroll)
      setTimeout(
        () => area?.scrollIntoView({ behavior: "smooth", block: "start" }),
        40,
      );
  }
}

function renderAdvanced({ preserveInputs = false } = {}) {
  const c = $("advancedContent");
  if (!c) return;
  const drafts = preserveInputs
    ? [...c.querySelectorAll("input[id], textarea[id], select[id]")]
        .filter((control) => control.type !== "file")
        .map((control) => ({
          id: control.id,
          value: control.value,
          checked: control.checked,
        }))
    : [];
  const previousHomePhoto =
    advancedTab === "home" ? c.querySelector("[data-home-photo]") : null;
  const previousHomeHeight =
    previousHomePhoto?.closest(".homeWelcome")?.style.height || "";
  const previousHomeUrl = previousHomePhoto?.getAttribute("src") || null;
  const shouldAnimate = animateNextModuleRender;
  animateNextModuleRender = false;
  const map = {
    vinculo: renderAdvVinculo,
    aventuras: renderAdvAdventures,
    fe: renderAdvFaith,
    home: renderAdvHome,
    story: renderAdvStory,
    memories: renderAdvMemories,
    letters: renderAdvLetters,
    dreams: renderAdvDreams,
    challenges: renderAdvChallenges,
    ideas: renderAdvIdeas,
    dates: renderAdvDates,
    goals: renderAdvGoals,
    budget: renderAdvBudget,
    notifications: renderAdvNotifications,
    question: renderAdvQuestion,
    places: renderAdvPlaces,
    analysis: renderAdvAnalysis,
    achievements: renderAdvAchievements,
    private: renderAdvPrivate,
    settings: renderAdvSettings,
  };
  c.classList.remove("tab-enter", "tab-leave");
  c.innerHTML = (map[advancedTab] || renderAdvHome)();
  for (const draft of drafts) {
    const control = $(draft.id);
    if (control && c.contains(control)) {
      control.value = draft.value;
      if (control.type === "checkbox" || control.type === "radio")
        control.checked = draft.checked;
    }
  }
  if (advancedTab === "home" && previousHomeUrl) {
    const nextPhoto = c.querySelector("[data-home-photo]");
    if (nextPhoto) {
      nextPhoto.src = previousHomeUrl;
      const frame = nextPhoto.closest(".homeWelcome");
      if (frame && previousHomeHeight) frame.style.height = previousHomeHeight;
    }
  }
  if (shouldAnimate) {
    void c.offsetWidth;
    c.classList.add("tab-enter");
    window.setTimeout(() => c.classList.remove("tab-enter"), 760);
  }
  hydrateMemoryImages();
  updateNotificationBadge();
  if (
    advancedTab === "home" &&
    !document.body.classList.contains("auth-pending")
  )
    setTimeout(() => applyHomePhoto(), 0);
}

function openAdvModal(title, body) {
  const modal = $("advModal");
  document.activeElement?.blur();
  modal.classList.remove("is-closing");
  $("advModalTitle").textContent = title;
  $("advModalBody").innerHTML = body;
  modal.classList.add("show");
  modal.querySelector(".modalBox").scrollTop = 0;
  $("advModalTitle").setAttribute("tabindex", "-1");
  $("advModalTitle").focus({ preventScroll: true });
}

function closeAdvModal() {
  const modal = $("advModal");
  if (!modal || !modal.classList.contains("show")) return;
  if (homePhotoCropState?.objectUrl) {
    URL.revokeObjectURL(homePhotoCropState.objectUrl);
    homePhotoCropState = null;
  }
  modal.classList.add("is-closing");
  window.setTimeout(() => {
    if (modal.classList.contains("is-closing"))
      modal.classList.remove("show", "is-closing");
  }, 210);
}
