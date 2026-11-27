const test = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
function context(file, extra = {}) {
  const sandbox = {
    console,
    URL,
    URLSearchParams,
    setTimeout,
    clearTimeout,
    window: { addEventListener() {} },
    document: { addEventListener() {} },
    SUPABASE_URL: "https://example.supabase.co",
    ...extra,
  };
  vm.createContext(sandbox);
  for (const name of Array.isArray(file) ? file : [file])
    vm.runInContext(fs.readFileSync(name, "utf8"), sandbox);
  return sandbox;
}
test("personalization normalizes lists and preserves required modules", () => {
  const c=context("src/personalization.js");
  const p=c.normalizePersonalPreferences({module_order:["fe","fe","unknown"],hidden_modules:["home","calendar","settings","letters","unknown"],shortcuts:["fe","calendar","story","goals","budget","places","letters"],home_sections:[],density:"compact",text_size:"large",motion:"reduced"});
  assert.equal(p.module_order[0],"fe");
  assert.equal(new Set(p.module_order).size,19);
  assert.ok(p.shortcuts.includes("dreams"));
  assert.deepEqual(Array.from(p.hidden_modules),["letters"]);
  assert.equal(p.shortcuts.length,6);
  assert.equal(p.home_sections.length,0);
  assert.equal(p.density,"compact");
});
test("photo framing clamps metadata and keeps the default centered composition",()=>{
  const c=context("src/photo-frame.js");
  assert.equal(c.photoFrameStyle({}),"object-position:50% 50%;transform-origin:50% 50%;transform:scale(1);");
  assert.equal(c.photoFrameStyle({photo_x:-20,photo_y:125,photo_zoom:12}),"object-position:0% 100%;transform-origin:0% 100%;transform:scale(3);");
  assert.equal(c.photoFrameStyle({home_photo_x:25,home_photo_y:75,home_photo_zoom:2},true),"object-position:25% 75%;transform-origin:25% 75%;transform:scale(2);");
});
test("story combines history without repeating linked memories or revealing locked letters", () => {
  const c=context("src/story.js",{categoryIcon:()=>"🗓️"});
  const cache={
    memories:[{id:"m",title:"Café en el parque",memory_date:"2026-10-26",favorite:true,photo_url:"pair/photo.png",source_plan_id:"p",source_occurrence_date:"2026-10-26"}],
    adventures:[{id:"a",title:"Café",status:"done",kind:"experience",memory_id:"m",plan_id:"p",target_date:"2026-10-26"},{id:"pending",title:"Future",status:"pending",kind:"surprise"}],
    dates:[{id:"d",title:"Fecha especial",event_date:"2026-10-27"}],
    dreams:[{id:"dream",title:"Sueño",status:"cumplido",completed_at:"2026-11-01T15:00:00Z"}],
    letters:[{id:"locked",title:"Hidden",content:"SECRET",unlock_at:"2026-12-01T12:00:00Z"},{id:"open",title:"Carta",content:"PRIVATE BODY",created_at:"2026-11-03T12:00:00Z"}],
  };
  const plans=[{id:"p",title:"Café",plan_date:"2026-10-26",completed:true},{id:"r",title:"Weekly",recurrence_enabled:true,completed_occurrences:["2026-11-01","2026-11-02"],cancelled_occurrences:["2026-11-02"]}];
  const entries=c.collectStoryEntries(cache,plans,"2026-11-26",Date.parse("2026-11-26T12:00:00Z"));
  assert.equal(entries.length,5);
  assert.ok(entries.find(x=>x.id==="m").badge);
  assert.ok(!entries.some(x=>["p","a","locked","pending"].includes(x.id)));
  assert.ok(!JSON.stringify(entries).includes("PRIVATE BODY"));
  const filters={month:"",kind:"adventure",query:"cafe",favorites:true,view:"gallery",order:"oldest"};
  assert.equal(c.filterStoryEntries(entries,filters)[0].id,"m");
  assert.equal(c.storyThrowbacks(entries,"2026-11-26").entries[0].id,"m");
});
test("faith devotional is deterministic by date, supports both partners, and escapes journal text", () => {
  const c=context(["src/faith-readings.js","src/faith.js"],{
    countdownToday:()=>"2026-11-26", user:{id:"a"},
    advCache:{faith:[
      {id:"p",kind:"prayer",created_by:"b",title:"Prayer <example>",body:"Private",entry_date:"2026-11-26",answered:false},
      {id:"s",kind:"support",created_by:"a",parent_id:"p",entry_date:"2026-11-26"},
      {id:"d",kind:"devotional",created_by:"a",entry_date:"2026-11-26"},
    ]},
    dateES:x=>x,esc:x=>String(x).replaceAll("<","&lt;").replaceAll(">","&gt;")
  });
  assert.notEqual(c.faithReading("2026-11-26")[0],c.faithReading("2026-11-27")[0]);
  assert.equal(c.faithReading("2026-11-26")[0],c.faithReading("2026-11-26")[0]);
  const html=c.renderAdvFaith();
  assert.match(html,/Prayer &lt;example&gt;/);
  assert.match(html,/Ya oraste hoy/);
  assert.match(html,/Devocional realizado/);
  assert.doesNotMatch(html,/Marcar respondida/);
  assert.match(html,/Pongámoslo en práctica/);
  assert.match(html,/Oremos juntos/);
  const readings=vm.runInContext("faithReadings",c);
  assert.equal(readings.length,63);
  assert.equal(new Set(readings.map(r=>r[0])).size,63);
  for(const r of readings) {
    assert.equal(r.length,6);
    assert.ok(r[2].split("\n").length>=2);
    assert.ok(r[2].split(/\s+/).length>=80);
    assert.ok(r[3].length>40&&r[4].length>40&&r[5].length>40);
  }
  const cycle=Array.from({length:63},(_,i)=>{
    const d=new Date(Date.UTC(2026,10,27+i)).toISOString().slice(0,10);
    return c.faithReading(d)[0];
  });
  assert.equal(new Set(cycle).size,63);
  assert.equal(c.faithReading("2026-11-26")[0],readings[Math.floor(Date.UTC(2026,10,26)/86400000)%21][0]);
});
test("adventures show locked surprises, recipient-only coupons and completed stamps", () => {
  const c = context(["src/adventures.js","src/integrated.js"], {
    user:{id:"recipient"}, plans:[],
    advCache:{ideas:[],memories:[],adventures:[
      {id:"s",created_by:"creator",kind:"surprise",title:"Cita sorpresa",status:"pending",details:"",adventure_secrets:null},
      {id:"c",created_by:"creator",kind:"coupon",title:"Desayuno",status:"pending",details:""},
      {id:"e",created_by:"creator",kind:"experience",title:"Picnic <3",status:"done",category:"naturaleza",completed_at:"2026-11-26T12:00:00Z"},
    ]},
    dateES: value=>value,
    esc: value=>String(value).replaceAll("<","&lt;").replaceAll(">","&gt;"),
  });
  const view=c.renderAdvAdventures();
  assert.match(view,/Los detalles se revelarán/);
  assert.doesNotMatch(view,/Revelar sorpresa/);
  assert.match(view,/Canjear 💗/);
  assert.match(view,/Picnic &lt;3/);
  assert.match(view,/adventureStamp/);
  c.user={id:"creator"};
  assert.match(c.renderAdvAdventures(),/Revelar sorpresa/);
  assert.doesNotMatch(c.renderAdvAdventures(),/Canjear 💗/);
});
test("connection sends once, uses the authenticated sender and keeps private text off notifications", async () => {
  const inserted = [], notifications = [];
  const input = {value: "Eres increíble <3"};
  const c = context(["src/knowing.js","src/vinculo.js"], {
    user:{id:"one"}, couple:{id:"pair"}, advCache:{connection:[]},
    advancedTab:"home",
    $: id => id === "bondCompliment" ? input : null,
    showAppToast: () => {},
    sb:{from: table => {
      assert.equal(table,"couple_connection");
      return {insert: row => {
        inserted.push(row);
        return {select: () => ({single: async () => ({data:{...row,id:"detail",created_at:"2026-11-26T12:00:00Z"}})})};
      }};
    }},
    createPartnerNotification: async notice => notifications.push(notice),
    esc: value => String(value).replaceAll("<","&lt;").replaceAll(">","&gt;"),
  });
  await Promise.all([c.sendConnection("compliment"),c.sendConnection("compliment")]);
  assert.equal(inserted.length,1);
  assert.equal(inserted[0].sender_user_id,"one");
  assert.equal(inserted[0].body,"Eres increíble <3");
  assert.equal(input.value,"");
  assert.equal(notifications.length,1);
  assert.equal(notifications[0].target_tab,"vinculo");
  assert.ok(!JSON.stringify(notifications[0]).includes("increíble"));
  assert.ok(c.renderAdvVinculo().includes("Eres increíble &lt;3"));
});
test("knowing keeps partner answers hidden until own response and scores preferences",()=>{
 const c=context("src/knowing.js",{user:{id:"one"},advCache:{knowing:[{question_key:"connection-01",user_id:"two",answer:"PRIVATE <secret>"}]},esc:v=>String(v).replaceAll("<","&lt;").replaceAll(">","&gt;")});
 assert.doesNotMatch(c.renderKnowing(),/PRIVATE/);
 c.advCache.knowing.push({question_key:"connection-01",user_id:"one",answer:"My response"});
 assert.match(c.renderKnowing(),/PRIVATE &lt;secret&gt;/);
 assert.equal(c.knowingScore("11223345")[0].score,2);
 assert.equal(c.knowingScore("11111111")[0].score,8);
 assert.equal(c.knowingScore("invalid").length,0);
});
test("calendar constrains all seven tracks and uses a full-width layout for rotated phones", () => {
  const css = fs.readFileSync("styles.css", "utf8");
  assert.match(css, /\.workspace \.week,\s*\.workspace \.grid\s*\{[^}]*grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /\(orientation:landscape\) and \(max-height:600px\) and \(max-width:1200px\)\s*\{\s*\.workspace\{grid-template-columns:minmax\(0,1fr\)/);
  assert.match(css, /\.workspace \.calendarToolbar\{grid-template-columns:max-content minmax\(0,1fr\)/);
});
test("Colombian holidays apply fixed dates, Monday transfers, Easter and the new July holiday", () => {
  const c = context("src/calendar.js", { iso: d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` });
  const h = year => c.colombianHolidays(year);
  assert.equal(h(2025).has("2025-07-14"), false);
  assert.equal(h(2026).get("2026-07-13")[0], "Virgen de Chiquinquirá");
  assert.equal(h(2027).get("2027-07-12")[0], "Virgen de Chiquinquirá");
  assert.equal(h(2027).has("2027-07-09"), false);
  for (const key of ["2027-01-01", "2027-01-11", "2027-03-25", "2027-03-26", "2027-05-10", "2027-05-31", "2027-06-07", "2027-07-20", "2027-12-08", "2027-12-25"]) assert.ok(h(2027).has(key), key);
  assert.equal(h(2027).size, 19);
  for (const key of ["2028-04-13", "2028-04-14", "2028-05-29", "2028-06-19", "2028-06-26", "2029-03-29", "2029-06-11", "2030-07-01"]) assert.ok(h(Number(key.slice(0,4))).has(key), key);
  assert.equal([...h(2030).values()].flat().length, 19);
  const descriptions = vm.runInContext("COLOMBIAN_HOLIDAY_DESCRIPTIONS", c);
  for (const names of h(2027).values()) for (const name of names) assert.ok(descriptions[name]?.length > 25, name);
});
test("saving a changed theme requests widget sync only after persistence", async () => {
  const calls = [];
  const c = context("src/settings.js", {
    couple: { id: "pair" }, user: { id: "one" }, coupleSettings: { theme: "romance" },
    sb: {
      from: () => ({ upsert: (payload) => ({ select: () => ({ single: async () => {
        calls.push("saved"); return { data: payload };
      } }) }) }),
      functions: { invoke: async (name, options) => {
        calls.push(name); assert.equal(options.body.couple_id, "pair"); return {};
      } },
    },
  });
  c.applyCoupleSettings = () => {};
  c.applyHomePhoto = async () => {};
  assert.equal(await c.saveCoupleSettings({ theme: "night" }), true);
  assert.deepEqual(calls, ["saved", "refresh-calendar-widgets"]);
  await c.saveCoupleSettings({ theme: "night" });
  assert.deepEqual(calls, ["saved", "refresh-calendar-widgets", "saved"]);
});
test("all persisted plan changes request a silent widget refresh alongside the partner notice", async () => {
  const calls = [];
  const c = context("src/notifications.js", {
    couple: { id: "pair" }, user: { id: "one" },
    sb: {
      rpc: async (name, args) => {
        calls.push("saved");
        return { data: { id: "notice", recipient_user_id: "two", event_type: args.p_event_type } };
      },
      functions: { invoke: async (name, options) => {
        calls.push(name);
        if (name === "refresh-calendar-widgets") {
          assert.equal(options.body.couple_id, "pair");
          assert.equal(options.body.notification_id, "notice");
        }
        return {};
      } },
    },
  });
  for (const event_type of ["plan_created", "plan_updated", "plan_deleted", "plan_occurrence_completed", "plan_occurrence_reopened", "plan_occurrence_cancelled", "plan_occurrence_reactivated", "plan_occurrence_rescheduled"]) {
    calls.length = 0;
    await c.createPartnerNotification({ event_type, target_tab: "calendar" });
    assert.deepEqual(calls, ["saved", "refresh-calendar-widgets", "send-push-notification"]);
  }
  calls.length = 0;
  await c.createPartnerNotification({ event_type: "plan_task_created", target_tab: "calendar" });
  assert.deepEqual(calls, ["saved", "send-push-notification"]);
});
test("old signed URLs and storage paths resolve to the same object", () => {
  const c = context("src/enhancements.js");
  assert.equal(
    c.memoryStoragePath(
      "https://example.supabase.co/storage/v1/object/sign/couple-media/pair/photo%20one.jpg?token=expired",
    ),
    "pair/photo one.jpg",
  );
  assert.equal(c.memoryStoragePath("pair/photo.jpg"), "pair/photo.jpg");
  assert.equal(
    c.memoryStoragePath(
      "https://other.example/storage/v1/object/sign/couple-media/pair/photo.jpg",
    ),
    null,
  );
  assert.equal(
    c.memoryStoragePath(
      "https://example.supabase.co/storage/v1/object/sign/other/pair/photo.jpg",
    ),
    null,
  );
});
test("simultaneous photo requests share one signing operation", async () => {
  let calls = 0;
  const c = context("src/enhancements.js", {
    user: { id: "one" },
    sb: {
      storage: {
        from: () => ({
          createSignedUrl: async () => {
            calls++;
            return { data: { signedUrl: "https://signed.example/photo" } };
          },
        }),
      },
    },
  });
  const urls = await Promise.all([
    c.memoryImageUrl("pair/photo.jpg"),
    c.memoryImageUrl("pair/photo.jpg"),
  ]);
  assert.equal(calls, 1);
  assert.equal(urls[0], urls[1]);
});
test("double clicks produce one mutation and allow a subsequent save", async () => {
  const c = context("src/ui.js");
  let calls = 0;
  c.showTransactionIndicator = () => {};
  c.hideTransactionIndicator = () => {};
  const save = c.withTransactionIndicator(async () => {
    calls++;
    return "saved";
  });
  await Promise.all([save(), save()]);
  assert.equal(calls, 1);
  await save();
  assert.equal(calls, 2);
});
test("memory search combines text, year and favorites", () => {
  const c = context("src/enhancements.js", {
    advCache: {
      memories: [
        { title: "Viaje a Salento", memory_date: "2026-04-01", favorite: true },
        { title: "Viaje a Salento", memory_date: "2025-04-01", favorite: true },
        { title: "Café", memory_date: "2026-04-01", favorite: false },
      ],
    },
  });
  vm.runInContext(
    "memoryFilters={query:'salento',year:'2026',favorites:true}",
    c,
  );
  assert.equal(c.filteredMemories().length, 1);
});
test("data refreshes are serialized and skip a signed-out session", async () => {
  const user = { id: "one" },
    couple = { id: "pair" };
  let active = 0,
    max = 0,
    calls = 0;
  const c = context("src/enhancements.js", {
    user,
    couple,
    advTables: { memories: "memories" },
    loadAdvancedData: async () => {
      calls++;
      active++;
      max = Math.max(max, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
    },
  });
  await Promise.all([c.advLoadAll(), c.advLoadAll()]);
  assert.equal(max, 1);
  assert.equal(calls, 2);
  const queued = c.advLoadAll();
  c.user = null;
  await queued;
  assert.equal(calls, 2);
});
test("a failed query preserves the current module data", async () => {
  const cache = { memories: [{ id: "existing" }] };
  const chain = {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    order() {
      return this;
    },
    range: async () => ({ error: { message: "offline" } }),
  };
  const c = context("src/data.js", {
    couple: { id: "pair" },
    user: { id: "user" },
    sb: { from: () => chain },
    advTables: { memories: "memories" },
    advCache: cache,
    dataLoadRevision: 0,
    advancedTab: "memories",
    setConnectionStatus() {},
    loadCoupleSettings: async () => {},
    $: () => ({ children: [{}] }),
    updateNotificationBadge() {},
    render() {},
    renderAdvanced() {},
    pendingModuleRender: false,
  });
  await c.loadAdvancedData();
  assert.equal(cache.memories[0].id, "existing");
});
test("bundle compiles with every feature in the build order", () => {
  new vm.Script(fs.readFileSync("public/app.js", "utf8"));
  const manifest = JSON.parse(fs.readFileSync("public/manifest.json", "utf8"));
  assert.ok(manifest.icons.some((icon) => icon.sizes === "512x512"));
  assert.ok(
    fs.readFileSync("public/sw.js", "utf8").includes("/auth-visuals.css"),
  );
});

test("scheduled letters show metadata without recipient edit controls", () => {
  const letter = {
    id: "scheduled",
    title: "Para mañana",
    content: null,
    created_by: "author",
    unlock_at: "2099-01-01T00:00:00Z",
  };
  const c = context("src/letters.js", {
    user: { id: "recipient" },
    advHeader: () => "",
    esc: (x) => String(x || ""),
    advCache: { letters: [letter], places: [] },
  });
  const html = c.renderAdvLetters();
  assert.match(html, /Para mañana/);
  assert.match(html, /Se desbloquea/);
  assert.doesNotMatch(html, /openAdvancedEdit|toggleLetterLock|deleteAdvanced/);
  c.user.id = "author";
  assert.match(c.renderAdvLetters(), /openAdvancedEdit/);
});

test("next chapter selects today's future timed plan in Colombia", () => {
  const c = context("src/calendar.js", {
    plans: [
      { id: "past", plan_date: "2026-11-15", plan_time: "09:00:00" },
      { id: "today", plan_date: "2026-11-15", plan_time: "18:00:00" },
      { id: "tomorrow", plan_date: "2026-11-16", plan_time: "08:00:00" },
    ],
    parseDateOnly: (date) => new Date(date + "T00:00:00"),
    addDaysDate: (date, days) => new Date(+date + days * 86400000),
    dateKeyLocal: (date) => date.toISOString().slice(0, 10),
  });
  assert.deepEqual(
    Array.from(
      c.getUpcomingPlanOccurrences(730, new Date("2026-11-15T16:00:00Z")),
      (plan) => plan.id,
    ),
    ["today", "tomorrow"],
  );
  assert.deepEqual(
    Array.from(
      c.getUpcomingPlanOccurrences(730, new Date("2026-11-15T23:00:00Z")),
      (plan) => plan.id,
    ),
    ["tomorrow"],
  );
});

test("calendar widget links select their month and reject impossible dates", () => {
  let renders = 0;
  const c = context("src/enhancements.js", {
    validAdvancedTabs: new Set(["calendar"]),
    showAdvancedTab() {},
    view: new Date(2026, 0, 1),
    parseDateOnly: (date) => new Date(date + "T00:00:00"),
    dateKeyLocal: (date) =>
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0"),
    render() {
      renders++;
    },
  });
  c.navigateToItem("calendar", null, "2027-02-12");
  assert.equal(c.view.getFullYear(), 2027);
  assert.equal(c.view.getMonth(), 1);
  assert.equal(c.view.getDate(), 12);
  c.navigateToItem("calendar", null, "2027-02-31");
  assert.equal(renders, 1);
  assert.equal(c.view.getDate(), 12);
});

test("monthly important dates keep their anchor after a short month", () => {
  const c = context("src/features.js", {
    advCache: {
      dates: [
        {
          id: "month-end",
          event_date: "2026-01-31",
          recurrence_type: "monthly",
          recurrence_interval: 1,
        },
      ],
    },
    dateKeyLocal: (date) =>
      date.getFullYear() +
      "-" +
      String(date.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(date.getDate()).padStart(2, "0"),
    addMonthsSafe: (date, count) => {
      const result = new Date(date.getFullYear(), date.getMonth() + count, 1);
      result.setDate(
        Math.min(
          date.getDate(),
          new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate(),
        ),
      );
      return result;
    },
  });
  assert.deepEqual(
    Array.from(
      c.getImportantDateOccurrencesForRange("2026-02-01", "2026-04-30"),
      (item) => item.date,
    ),
    ["2026-02-28", "2026-03-31", "2026-04-30"],
  );
});

test("Android release metadata rejects foreign download links and renders no desktop installer", () => {
  const c = context("src/android-updates.js", {
    navigator: { userAgent: "Desktop browser" },
    location: { search: "?ncAndroidVersion=3" },
  });
  const manifest = JSON.parse(fs.readFileSync("android-release.json", "utf8"));
  assert.equal(c.androidInstallCard(), "");
  assert.ok(c.validateAndroidRelease(manifest));
  assert.equal(
    c.validateAndroidRelease({
      ...manifest,
      apkUrl: "https://evil.example/app.apk",
    }),
    null,
  );
  assert.equal(
    c.validateAndroidRelease({ ...manifest, sha256: "invalid" }),
    null,
  );
  assert.equal(
    c.validateAndroidRelease({ ...manifest, bytes: 999999999 }),
    null,
  );
});

test("Android release checks share one fetch and never reuse a failed request", async () => {
  let count = 0;
  const manifest = JSON.parse(fs.readFileSync("android-release.json", "utf8"));
  const c = context("src/android-updates.js", {
    navigator: { userAgent: "Android" },
    location: { search: "" },
    AbortSignal,
    fetch: async () => {
      count++;
      return { ok: count !== 2, text: async () => JSON.stringify(manifest) };
    },
  });
  await Promise.all([c.fetchAndroidRelease(), c.fetchAndroidRelease()]);
  assert.equal(count, 1);
  await assert.rejects(c.fetchAndroidRelease());
  await c.fetchAndroidRelease();
  assert.equal(count, 3);
});

test("a newer Android release shows one dismissible notice with escaped text", async () => {
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM("<!doctype html><body></body>", {
    pretendToBeVisual: true,
  });
  const manifest = JSON.parse(fs.readFileSync("android-release.json", "utf8"));
  manifest.versionName = "<img src=x onerror=bad()>";
  let requests = 0;
  const c = context("src/android-updates.js", {
    window: dom.window,
    document: dom.window.document,
    navigator: { userAgent: "Android" },
    location: { search: "?ncAndroidVersion=1" },
    AbortSignal,
    $: (id) => dom.window.document.getElementById(id),
    esc: (value) =>
      String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;"),
    fetch: async () => {
      requests++;
      return { ok: true, text: async () => JSON.stringify(manifest) };
    },
  });
  await c.checkAndroidAppUpdate();
  await c.checkAndroidAppUpdate();
  const notice = dom.window.document.getElementById("androidUpdateNotice");
  assert.ok(notice);
  assert.equal(requests, 2);
  assert.equal(notice.querySelector("img"), null);
  assert.equal(
    notice.querySelector("a").getAttribute("href"),
    "calendario21://updates",
  );
  notice.querySelector("button").click();
  assert.equal(dom.window.document.getElementById("androidUpdateNotice"), null);
  dom.window.close();
});

test("widget pairing needs Android v4, a logged-in account and explicit approval", async () => {
  let prompts = 0, calls = 0;
  const node = { isConnected: true, innerHTML: "" };
  const c = context("src/widget-link.js", {
    location: { search: `?widget_challenge=${"a".repeat(64)}&widget_state=${"b".repeat(32)}` },
    androidDevice: () => true, nativeAndroidCode: 4,
    user: null, couple: { id: "pair" },
    openAdvModal: () => prompts++, $: () => node,
    esc: (s) => s, setTimeout: () => {},
    sb: { rpc: async (name,args) => { calls++; assert.equal(name,"create_widget_pair_code");
      assert.equal(args.p_couple_id,"pair"); return {data:"c".repeat(64)}; } },
  });
  c.maybeOfferWidgetLink(); assert.equal(prompts,0);
  c.user={id:"user"}; c.maybeOfferWidgetLink(); c.maybeOfferWidgetLink();
  assert.equal(prompts,1); assert.equal(calls,0);
  await c.createWidgetLink({disabled:false}); assert.equal(calls,1);
  assert.ok(node.innerHTML.includes("calendario21://widget-link?code="));
  assert.ok(!node.innerHTML.includes("access_token"));
});

test("widget pairing does not render a code after the active account changes", async () => {
  let resolve;
  const node={isConnected:true,innerHTML:""};
  const c=context("src/widget-link.js", {
    location:{search:`?widget_challenge=${"a".repeat(64)}&widget_state=${"b".repeat(32)}`},
    androidDevice:()=>true,nativeAndroidCode:4,user:{id:"one"},couple:{id:"pair"},
    $:()=>node,sb:{rpc:()=>new Promise(r=>resolve=r)},esc:s=>s,setTimeout:()=>{},
  });
  const pending=c.createWidgetLink({disabled:false}); c.user={id:"two"};
  resolve({data:"c".repeat(64)}); await pending; assert.equal(node.innerHTML,"");
});

test("Android widget links wait for login and return a one-use code only to the verified origin's port", async () => {
  const origin = "https://nuestrocalendario21.vercel.app";
  let receive;
  const host = {addEventListener(type, handler) { if (type === "message") receive = handler; }};
  host.top = host;
  const replies = [];
  const challenge = "a".repeat(64), state = "b".repeat(32), code = "c".repeat(64);
  let calls = 0;
  const c = context("src/widget-link.js", {
    window: host, location: {origin, search: ""}, user: null, couple: null,
    sb: {async rpc(name, args) {
      calls++;
      assert.equal(name, "create_widget_pair_code");
      assert.equal(args.p_challenge, challenge);
      assert.equal(args.p_state, state);
      return {data: code};
    }}
  });
  const event = {data: JSON.stringify({type:"nc21-widget-link", challenge, state}),
    origin, ports:[{postMessage: text => replies.push(JSON.parse(text))}]};
  receive({...event, origin:"https://unrelated.example"});
  c.user = {id:"user"}; c.couple = {id:"pair"};
  await c.completeNativeWidgetLink();
  assert.equal(calls, 0);
  c.user = null;
  receive({...event, data:""});
  event.ports[0].onmessage({data:event.data});
  assert.equal(calls, 0);
  c.user = {id:"user"};
  await c.completeNativeWidgetLink();
  await c.completeNativeWidgetLink();
  assert.deepEqual(replies, [{code, state}]);
  assert.equal(calls, 1);
});

test("all nine Android widgets have distinct populated previews and can be placed without a session", () => {
  const xml = "android/app/src/main/res/xml";
  const providers = fs.readdirSync(xml).filter(name => name.endsWith("_widget.xml"));
  assert.equal(providers.length, 9);
  const previews = new Set();
  for (const name of providers) {
    const provider = fs.readFileSync(xml + "/" + name, "utf8");
    assert.doesNotMatch(provider, /android:configure=/);
    const layout = provider.match(/android:previewLayout="@layout\/(preview_[a-z_]+)"/)[1];
    const image = provider.match(/android:previewImage="@drawable\/(preview_[a-z_]+)"/)[1];
    assert.match(fs.readFileSync(`android/app/src/main/res/layout/${layout}.xml`, "utf8"), /Ejemplo/);
    assert.ok(fs.existsSync(`android/app/src/main/res/drawable-nodpi/${image}.png`) || fs.existsSync(`android/app/src/main/res/drawable/${image}.xml`));
    previews.add(layout);
  }
  assert.equal(previews.size, 9);
});

test("Android checks on every return and only confirms an equal published version", async () => {
  const release = JSON.parse(fs.readFileSync("android-release.json", "utf8"));
  const messages = [];
  let requests = 0;
  const c = context("src/android-updates.js", {
    navigator: {userAgent:"Android"}, location:{search:"?ncAndroidVersion="+release.versionCode},
    AbortSignal, $: () => null, showAppToast: message => messages.push(message),
    fetch: async () => ({ok: ++requests !== 3, text: async () => JSON.stringify(release)})
  });
  await c.checkAndroidAppUpdate(); await c.checkAndroidAppUpdate(); await c.checkAndroidAppUpdate();
  assert.equal(requests, 3);
  assert.match(messages[0], /Ya tienes la última versión/);
  assert.equal(messages[1], messages[0]);
  assert.match(messages[2], /No pudimos comprobar/);
});

test("push click prefers the installed calendar over a browser tab", async () => {
  const origin = "https://calendar.example";
  const listeners = {};
  let navigated;
  let focused = false;
  const androidClient = {
    url: origin + "/?ncAndroidVersion=7&ncAndroidName=preview.7",
    async navigate(url) {
      navigated = new URL(url);
      return this;
    },
    async focus() {
      focused = true;
    },
  };
  context("sw.js", {
    self: {
      location: { origin },
      addEventListener(name, listener) { listeners[name] = listener; },
      clients: {
        async matchAll() { return [{ url: origin + "/" }, androidClient]; },
        async openWindow() { assert.fail("unexpected browser window"); },
      },
    },
  });
  let completion;
  listeners.notificationclick({
    notification: { close() {}, data: { url: "/?tab=plans&item=123" } },
    waitUntil(promise) { completion = promise; },
  });
  await completion;
  assert.equal(focused, true);
  assert.equal(navigated.searchParams.get("item"), "123");
  assert.equal(navigated.searchParams.get("ncAndroidVersion"), "7");
});
