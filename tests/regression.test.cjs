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
  vm.runInContext(fs.readFileSync(file, "utf8"), sandbox);
  return sandbox;
}
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
  assert.equal(requests, 1);
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
  receive(event);
  assert.equal(calls, 0);
  c.user = {id:"user"};
  await c.completeNativeWidgetLink();
  await c.completeNativeWidgetLink();
  assert.deepEqual(replies, [{code, state}]);
  assert.equal(calls, 1);
});

test("all five Android widgets may be placed before a session exists", () => {
  const xml = "android/app/src/main/res/xml";
  const providers = fs.readdirSync(xml).filter(name => name.endsWith("_widget.xml"));
  assert.equal(providers.length, 5);
  for (const name of providers)
    assert.doesNotMatch(fs.readFileSync(xml + "/" + name, "utf8"), /android:configure=/);
});
