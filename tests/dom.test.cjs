const { JSDOM } = require("jsdom");
const fs = require("fs"),
  assert = require("node:assert/strict");
const root = require("path").join(__dirname, "../public/");
const html = fs
  .readFileSync(root + "index.html", "utf8")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
const dom = new JSDOM(html, {
  url: "https://test.example/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
});
const w = dom.window;
const errors = [];
w.addEventListener("error", (e) => {
  errors.push(e.error);
  console.error("DOMERROR", e.error);
});
w.AbortSignal = global.AbortSignal;
w.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
w.HTMLElement.prototype.scrollIntoView = function () {};
w.HTMLElement.prototype.scrollTo = function () {};
w.fetch = async () => ({
  ok: true,
  json: async () => ({
    supabaseUrl: "https://test.example.supabase.co",
    supabaseKey: "test-key",
    environment: "preview",
  }),
});
w.eval(
  fs.readFileSync(
    require("path").join(__dirname, "fixtures/supabase-browser.js"),
    "utf8",
  ),
);
new (require("vm").Script)(
  fs.readFileSync(root + "app.js", "utf8"),
).runInContext(dom.getInternalVMContext());
new (require("vm").Script)(
  fs.readFileSync(root + "places-map.js", "utf8"),
).runInContext(dom.getInternalVMContext());
const wait = () => new Promise((r) => setTimeout(r, 400));
(async () => {
  await wait();
  await wait();
  assert.ok(
    w.document.body.classList.contains("app-ready"),
    "app should finish setup",
  );
  for (const tab of [
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
    "vinculo",
    "aventuras",
    "fe",
    "futuro",
    "places",
    "analysis",
    "achievements",
    "private",
    "settings",
  ]) {
    w.showAdvancedTab(tab);
    await wait();
    if(tab==="calendar")assert.ok(w.document.querySelector(".calendarCard .calendarModuleHero h2"));
    else if(tab==="home")assert.ok(w.document.querySelector(".homeWelcome [data-home-photo]"));
    else {
      const content=w.document.getElementById("advancedContent");
      assert.equal(content.querySelectorAll(".bondHero").length,1,tab);
      assert.ok(content.querySelector(".bondHero .bondHeroHeart"),tab);
      assert.ok(content.querySelector(".bondHero h2")?.textContent.trim(),tab);
    }
    if (tab !== "calendar")
      assert.ok(
        w.document.getElementById("advancedContent").textContent.trim(),
        tab,
      );
  }
  w.showAdvancedTab("memories");
  await wait();
  w.showAdvancedTab("vinculo");
  assert.equal(w.document.getElementById("knowingSection"),null);
  w.showAdvancedTab("aventuras");
  w.setAdventureFilter("games");
  assert.equal(w.document.querySelectorAll(".gameMenu button").length,9);
  w.gamePickMode("trivia");w.startGameQuiz("trivia");
  assert.equal(w.document.querySelectorAll(".gameQuizOptions button").length,4);
  w.gameAnswer(0);assert.ok(w.document.querySelector(".gameQuizOptions .gameCorrect"));
  w.gamePickMode("puzzle");w.startGamePuzzle(3);
  assert.equal(w.document.querySelectorAll(".gamePuzzleTile").length,9);
  w.gamePuzzleTile(0);w.gamePuzzleTile(1);
  w.gamePickMode("guess");w.startGameQuiz("guess");
  assert.equal(w.document.querySelectorAll(".gameQuizPhoto").length,1);
  w.gamePickMode("roulette");w.spinGameDare();
  assert.match(w.document.querySelector(".gameModule").textContent,/Lo hicimos/);
  w.__db.couple_game_matches=[{id:"match-test",couple_id:"pair",kind:"tic",created_by:"user-one",opponent_id:"user-two",turn_user_id:"user-one",board:Array(9).fill(0),status:"active",move_count:0,created_at:"2026-11-27T12:00:00Z"}];
  await w.advLoadAll(["gameMatches"]);
  w.navigateToItem("aventuras","match-test");
  assert.equal(w.document.querySelectorAll(".gameTic .gameCell").length,9);
  w.setAdventureFilter("all");
  w.showTodayDailyQuestion();
  assert.equal(w.document.querySelectorAll("#knowingSection .knowingQuestion").length,1);
  const knowingKey=w.knowingToday().key;
  w.openKnowingQuestion(knowingKey);
  w.document.getElementById("knowingAnswer").value="Nuestro momento de prueba";
  await w.saveKnowing(knowingKey);
  assert.equal(w.__db.couple_knowing_answers[0].answer,"Nuestro momento de prueba");
  assert.match(w.document.getElementById("knowingSection").textContent,/Nuestro momento de prueba/);
  assert.equal(w.knowingToday().key,knowingKey);
  w.setKnowingCategory("history");
  assert.equal(w.document.querySelectorAll("#knowingSection .knowingQuestion").length,1);
  assert.equal(w.document.querySelectorAll("#knowingSection .knowingQuestion button").length,0);
  w.setKnowingCategory("quiz");
  w.openKnowingQuiz();
  for(let i=0;i<8;i++)w.document.querySelector(`input[name="knowingScene${i}"][value="2"]`).checked=true;
  await w.saveKnowing("love-v1");
  assert.equal(w.__db.couple_knowing_answers[1].answer,"22222222");
  assert.match(w.document.getElementById("knowingSection").textContent,/8\/8/);
  w.showTodayDailyQuestion();
  const currentQuestion=w.todayQuestion();
  assert.ok(currentQuestion.text);
  const previousDay=new Date(Date.parse(currentQuestion.date+"T00:00:00Z")-86400000).toISOString().slice(0,10);
  w.__db.daily_answers=[{id:"daily-partner",couple_id:"pair",user_id:"user-two",question_date:previousDay,question_text:currentQuestion.text,answer:"Respuesta anterior de prueba"}];
  await w.advLoadAll(["dailyAnswers"]);
  assert.match(w.document.getElementById("advancedContent").textContent,/Respuesta anterior de prueba/);
  w.document.getElementById("dailyAnswerInput").value="Respuesta de hoy de prueba";
  await w.saveDailyAnswer();
  assert.equal(w.__db.daily_answers.length,2);
  assert.equal(w.__db.daily_answers[1].question_text,currentQuestion.text);
  assert.equal(w.document.getElementById("dailyAnswerInput"),null);
  assert.match(w.document.getElementById("advancedContent").textContent,/1\/365 preguntas respondidas por ambos/);
  w.showAdvancedTab("memories");
  await wait();
  assert.equal(
    w.document.querySelector("[data-memory-path]").getAttribute("src"),
    "/icon-192.png",
  );
  w.document.getElementById("memorySearch").value = "no match";
  w.applyMemoryFilters();
  assert.equal(w.document.querySelectorAll("[data-memory-path]").length, 0);
  w.clearMemoryFilters();
  w.scheduleIdea("idea-one");
  assert.equal(w.document.getElementById("title").value, "Café en el parque");
  assert.equal(w.document.getElementById("planPlaceId").value, "place-one");
  const category = w.document.getElementById("cat");
  assert.equal(category.options.length, 22);
  category.value = "iglesia";
  await w.savePlan();
  const newPlan = w.__db.plans.find((p) => p.title === "Café en el parque");
  assert.equal(newPlan.category, "iglesia");
  assert.equal(w.categoryIcon("iglesia"), "⛪");
  w.openEditModal(newPlan);
  assert.equal(category.value, "iglesia");
  category.value = "comida";
  await w.savePlan();
  assert.equal(w.__db.plans.find((p) => p.id === newPlan.id).category, "comida");
  w.closeModal();
  w.showAdvancedTab("futuro");
  w.openFutureProject("marriage");
  const suggested=w.document.getElementById("futureSuggested");
  assert.ok(suggested.checked);
  assert.equal(suggested.labels[0].className,"futureSuggestedLabel");
  assert.equal(suggested.getAttribute("aria-describedby"),"futureSuggestions");
  suggested.labels[0].click();
  assert.equal(suggested.checked,false);
  suggested.labels[0].click();
  assert.equal(suggested.checked,true);
  assert.equal(w.document.getElementById("adv_future_title").value,"Nuestro matrimonio");
  w.document.getElementById("adv_future_date").value="2028-04-21";
  w.document.getElementById("adv_future_goal").value="goal-one";
  await w.saveFutureProject("");
  assert.equal(w.__db.couple_future_projects[0].goal_id,"goal-one");
  assert.equal(w.__db.couple_future_steps.length,5);
  await w.toggleFutureStep("future-step-0");
  assert.equal(w.__db.couple_future_steps[0].done,true);
  assert.match(w.document.querySelector('[data-advanced-id="future-one"]').textContent,/20%/);
  w.scheduleFutureStep("future-step-1");
  assert.equal(w.document.getElementById("date").value,"2028-04-21");
  await w.savePlan();
  assert.ok(w.__db.couple_future_steps[1].plan_id);
  w.closeModal();
  const filter = w.document.getElementById("planCategoryFilter");
  const calendarCard = w.document.querySelector(".calendarCard");
  assert.equal(calendarCard.querySelectorAll("#grid > .day").length, 42);
  assert.deepEqual(Array.from(calendarCard.querySelector(".calendarToolbar").children).map(el => el.classList.contains("calendarAddPlan") ? "add" : el.classList.contains("calendarFilter") ? "filter" : el.classList.contains("calendarMonthHeading") ? "month" : "navigation"), ["add", "filter", "month", "navigation"]);
  assert.equal(calendarCard.querySelector(".calendarFilterLabel").htmlFor, "planCategoryFilter");
  const monthPicker = w.document.getElementById("calendarMonthPicker");
  assert.equal(monthPicker.type, "month");
  let openedNativePicker = false;
  monthPicker.showPicker = () => { openedNativePicker = true; };
  w.openCalendarMonthPicker({ preventDefault() {} });
  assert.ok(openedNativePicker);
  monthPicker.value = "2027-07";
  w.selectCalendarMonth();
  assert.equal(w.document.getElementById("month").textContent, "Julio 2027");
  assert.match(w.document.getElementById("grid").textContent, /Virgen de Chiquinquirá/);
  assert.ok(w.document.querySelectorAll(".calendarRestNumber").length >= 6);
  assert.ok(w.document.querySelector('[data-date="2027-07-12"] .calendarRestNumber'));
  assert.ok(w.document.querySelector('[data-date="2027-07-11"] .calendarRestNumber'));
  assert.equal(w.document.querySelector('[data-date="2027-07-12"] .calendarHolidayLabel').tagName, "BUTTON");
  w.handleDayClick("2027-07-12");
  assert.ok(w.document.getElementById("advModal").classList.contains("show"));
  assert.match(w.document.getElementById("advModalBody").textContent, /patrona de Colombia/);
  assert.match(w.document.getElementById("advModalBody").textContent, /Agregar plan para este día/);
  w.closeAdvModal();
  w.handleDayClick("2027-07-11");
  assert.equal(w.document.getElementById("date").value, "2027-07-11");
  await new Promise(r => setTimeout(r, 100));
  assert.equal(w.document.activeElement.id, "modalTitle", "opening a plan must not focus an input");
  w.document.getElementById("title").focus();
  assert.equal(w.document.activeElement.id, "title");
  w.closeModal();
  assert.equal(monthPicker.value, "2027-07");
  w.today();
  assert.match(monthPicker.value, /^\d{4}-\d{2}$/);
  monthPicker.type = "text";
  w.syncCalendarMonthPicker();
  assert.equal(monthPicker.type, "date");
  monthPicker.value = "2028-04-18";
  w.selectCalendarMonth();
  assert.equal(w.document.getElementById("month").textContent, "Abril 2028");
  assert.equal(monthPicker.value, "2028-04-01");
  monthPicker.type = "month";
  monthPicker.min = "1984-01";
  monthPicker.max = "2199-12";
  w.today();
  filter.value = "comida";
  w.render();
  assert.match(w.document.getElementById("grid").textContent, /🍽️ Café en el parque/);
  filter.value = "iglesia";
  w.render();
  assert.doesNotMatch(w.document.getElementById("grid").textContent, /Café en el parque/);
  filter.value = "";
  w.render();
  w.showAdvancedTab("goals");
  w.openPlansModal("2027-07-11");
  assert.equal(w.document.getElementById("plansModal").style.display, "grid");
  w.closePlansModal();
  assert.ok(w.document.getElementById("plansModal").classList.contains("is-closing"));
  w.openPlansModal("2027-07-12");
  await new Promise(r => setTimeout(r, 230));
  assert.equal(w.document.getElementById("plansModal").style.display, "grid");
  w.closePlansModal();
  const prompt = w.appDialogOpen({ mode: "prompt", message: "Prueba" });
  await new Promise(r => setTimeout(r, 50));
  assert.equal(w.document.activeElement.id, "appDialogTitle");
  w.appDialogClose(null);
  await prompt;
  w.openGoalMovement("goal-one", "add");
  w.document.getElementById("goalMovementAmount").value = "50";
  await w.saveGoalMovement("goal-one", "add");
  assert.equal(w.__db.goals[0].current_amount, 150);
  w.showAdvancedTab("memories");
  w.openAdvancedEdit("memories", "memory-one");
  assert.equal(w.document.getElementById("adv_title").value, "Viaje de prueba");
  w.document.getElementById("adv_title").value = "Recuerdo editado";
  await w.saveAdvancedEdit();
  assert.ok(w.__db.memories.some((m) => m.title === "Recuerdo editado"));
  await w.openPhotoFrame("memory",w.__db.memories.find(m=>m.id==="memory-one"));
  w.changePhotoFrame("x",20);
  w.changePhotoFrame("zoom",1.5);
  const frameImage=w.document.getElementById("photoFrameImage");
  assert.equal(frameImage.style.objectPosition,"20% 50%");
  frameImage.dispatchEvent(new w.Event("load"));
  await w.savePhotoFrame();
  const framed=w.__db.memories.find(m=>m.id==="memory-one");
  assert.equal(framed.photo_url,"pair/photo.png");
  assert.equal(framed.photo_x,20);
  assert.equal(framed.photo_zoom,1.5);
  w.showAdvancedTab("dreams");
  w.openDreamForm();
  w.document.getElementById("adv_title").value="Viaje soñado";
  w.document.getElementById("adv_dream_goal").value="goal-one";
  await w.saveDream();
  assert.equal(w.__db.dreams.find(d=>d.title==="Viaje soñado").goal_id,"goal-one");
  w.showAdvancedTab("goals");
  assert.equal(w.document.querySelector(".advTab.active").getAttribute("onclick"),"showAdvancedTab('dreams')");
  w.navigateToItem("ideas","idea-one");
  assert.equal(w.document.querySelector(".advTab.active").getAttribute("onclick"),"showAdvancedTab('aventuras')");
  assert.ok(w.document.querySelector('[data-advanced-id="idea-one"]'));
  w.showAdvancedTab("aventuras");
  w.openAdventureForm("experience");
  assert.equal(w.document.getElementById("adv_photo").type,"file");
  assert.ok(w.document.querySelector('#adv_place_id option[value="place-one"]'));
  w.document.getElementById("adv_title").value="Experiencia con lugar";
  w.document.getElementById("adv_place_id").value="place-one";
  Object.defineProperty(w.document.getElementById("adv_photo"),"files",{value:[new w.File(["fixture"],"aventura.png",{type:"image/png"})]});
  await w.saveMemory();
  assert.equal(w.__db.couple_adventures[0].memory_id,"memory-adventure");
  assert.equal(w.__db.memories.find(m=>m.id==="memory-adventure").place_id,"place-one");
  assert.match(w.__db.memories.find(m=>m.id==="memory-adventure").photo_url,/aventura\.png$/);
  w.showAdvancedTab("memories");
  assert.ok(w.document.querySelector('[data-adventure="adventure-memory"]'));
  w.showAdvancedTab("aventuras");
  assert.match(w.document.querySelector('[data-advanced-id="adventure-memory"]').textContent,/Ver recuerdo/);
  assert.ok(w.document.querySelector('[data-advanced-id="adventure-memory"] img[data-memory-path]'));
  w.showAdvancedTab("fe");
  w.openFaithLibrary();
  assert.equal(w.document.querySelectorAll(".faithLibraryItem").length,63);
  w.openFaithStudy(22);
  assert.match(w.document.getElementById("advModalBody").textContent,/Oremos juntos/);
  w.closeAdvModal();
  w.openFaithForm("prayer");
  w.document.getElementById("adv_faith_title").value="Petición de prueba";
  w.document.getElementById("adv_faith_body").value="Una nota compartida";
  await w.saveFaithEntry("prayer","");
  assert.ok(w.__db.couple_faith.some(x=>x.kind==="prayer"&&x.title==="Petición de prueba"));
  w.scheduleFaith();
  assert.equal(w.document.getElementById("cat").value,"iglesia");
  assert.equal(w.document.getElementById("title").value,"Orar y leer la Biblia juntos");
  w.closeModal();
  w.showAdvancedTab("story");
  assert.ok(w.document.querySelector(".storyMilestones"));
  assert.ok(w.document.querySelector(".storyChapterList .storyEntry"));
  w.setStoryView("gallery");
  assert.ok(w.document.querySelector(".storyGallery img[data-memory-path]"));
  w.document.getElementById("storySearch").value="no matching record";
  w.applyStoryFilters();
  assert.equal(w.document.querySelectorAll(".storyGallery .storyEntry").length,0);
  w.clearStoryFilters();
  const storyMemory=w.document.querySelector('.storyEntry[data-kind="memory"]');
  w.storyOpen(storyMemory);
  assert.equal(w.document.querySelector(".advTab.active").getAttribute("onclick"),"showAdvancedTab('memories')");
  w.showAdvancedTab("settings");
  w.openPersonalization();
  w.movePersonalModule("vinculo",-1);
  const visibility=w.document.querySelector('.personalModuleControls input[data-module="letters"]');
  visibility.checked=false;w.changePersonalVisibility(visibility);
  const favorite=w.document.querySelectorAll('.personalModuleControls input[data-module="fe"]')[1];
  favorite.checked=true;w.changePersonalShortcut(favorite);
  const homeStats=w.document.querySelector('input[data-section="stats"]');
  homeStats.checked=false;w.changePersonalSection(homeStats);
  w.document.getElementById("adv_personal_density").value="compact";
  w.document.getElementById("adv_personal_text").value="large";
  await w.savePersonalization();
  assert.equal(w.document.querySelector("#advancedNavModules .advTab").getAttribute("onclick"),"showAdvancedTab('vinculo')");
  assert.equal(w.document.querySelector('.advTab[onclick="showAdvancedTab(\'letters\')"]').hidden,true);
  assert.equal(w.document.body.dataset.personalDensity,"compact");
  assert.equal(w.__db.couple_personalization[0].shortcuts[0],"fe");
  w.showAdvancedTab("home");
  assert.ok(w.document.querySelector('.personalShortcuts button[data-module="fe"]'));
  assert.equal(w.document.querySelector(".homeStats").hidden,true);
  w.openAllModules();
  assert.ok(w.document.querySelector('#advModalBody button[data-module="letters"]'));
  w.closeAdvModal();
  w.showAdvancedTab("letters");
  assert.equal(w.document.querySelector('.advTab[onclick="showAdvancedTab(\'letters\')"]').hidden,false);
  w.showAdvancedTab("settings");
  w.openSharedCover();
  w.document.getElementById("adv_cover_title").value="Nuestro lugar <3";
  w.document.getElementById("adv_cover_subtitle").value="Nuestro futuro juntos";
  w.applyHomePhoto=async()=>{};
  await w.saveSharedCover();
  w.showAdvancedTab("home");
  assert.match(w.document.querySelector(".homeWelcome h2").textContent,/Nuestro lugar <3/);
  assert.match(w.document.querySelector(".homeWelcome p").textContent,/Nuestro futuro juntos/);
  assert.deepEqual(errors, []);
  console.log(
    "PASS DOM: integrated tabs and legacy routes, photo framing, dream savings, memory edit, plan and goal operations.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => w.close());
