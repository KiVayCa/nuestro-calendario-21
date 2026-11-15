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
  await w.savePlan();
  assert.ok(w.__db.plans.some((p) => p.title === "Café en el parque"));
  w.closeModal();
  w.showAdvancedTab("goals");
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
