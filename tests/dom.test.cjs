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
    "places",
    "analysis",
    "achievements",
    "private",
    "settings",
  ]) {
    w.showAdvancedTab(tab);
    await wait();
    if (tab !== "calendar")
      assert.ok(
        w.document.getElementById("advancedContent").textContent.trim(),
        tab,
      );
  }
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
  assert.deepEqual(errors, []);
  console.log(
    "PASS DOM: 17 tabs, legacy photo hydration, filters, idea-to-plan with place, save plan, goal RPC, memory edit.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => w.close());
