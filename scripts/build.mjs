import { readFile, writeFile, mkdir, rm, copyFile, cp } from "node:fs/promises";
import { createHash } from "node:crypto";
import { Script } from "node:vm";

// A single classic script preserves the existing HTML handlers and map integration.
// Feature files own functions; runtime.js owns initialization and shared application state.
const sources = [
  "utils",
  "data",
  "goals",
  "letters",
  "questions",
  "navigation",
  "auth",
  "calendar",
  "features",
  "memories",
  "budget",
  "settings",
  "profile",
  "notifications",
  "realtime",
  "ui",
  "enhancements",
  "experience",
  "album-export",
  "runtime",
];
const chunks = await Promise.all(
  sources.map((name) => readFile(`src/${name}.js`, "utf8")),
);
const bundle = chunks
  .map((source, index) => `// src/${sources[index]}.js\n${source}`)
  .join("\n");
new Script(bundle, { filename: "app.js" });
await rm("public", { recursive: true, force: true });
await mkdir("public", { recursive: true });
await writeFile("public/app.js", bundle);
const assets = [
  "index.html",
  "styles.css",
  "auth-visuals.css",
  "places-map.js",
  "manifest.json",
  "icon-192.png",
  "icon-512.png",
  "notification-heart.svg",
  "notification-badge.svg",
  "pareja.jpeg",
];
for (const name of assets) await copyFile(name, `public/${name}`);
if (process.env.VERCEL_ENV === "preview") {
  const manifest = JSON.parse(await readFile("manifest.json", "utf8"));
  manifest.name = "Nuestro Calendario #21 TEST";
  manifest.short_name = "Calendario TEST";
  manifest.id = "/test";
  manifest.start_url = "/?test=1";
  await writeFile("public/manifest.json", JSON.stringify(manifest, null, 2));
}
await mkdir("public/vendor", { recursive: true });
await copyFile(
  "node_modules/@supabase/supabase-js/dist/umd/supabase.js",
  "public/vendor/supabase.js",
);
await cp("node_modules/leaflet/dist", "public/vendor/leaflet", {
  recursive: true,
});
assets.push(
  "vendor/supabase.js",
  "vendor/leaflet/leaflet.js",
  "vendor/leaflet/leaflet.css",
);
const allAssets = await Promise.all(
  ["app.js", ...assets].map((name) => readFile(`public/${name}`)),
);
const version = createHash("sha256")
  .update(Buffer.concat(allAssets))
  .digest("hex")
  .slice(0, 12);
await writeFile(
  "public/sw.js",
  (await readFile("sw.js", "utf8")).replaceAll("__BUILD_VERSION__", version),
);
console.log(`Built ${sources.length} source files. Cache version ${version}.`);
