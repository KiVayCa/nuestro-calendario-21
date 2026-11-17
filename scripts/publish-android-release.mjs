import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { put, head } from "@vercel/blob";

// Run only after testing/signing the release. The upload token stays in the environment.
const [apkPath, notesPath] = process.argv.slice(2);
if (
  !apkPath ||
  !notesPath ||
  !process.env.BLOB_READ_WRITE_TOKEN ||
  !process.env.ANDROID_HOME
)
  throw new Error(
    "Usage: BLOB_READ_WRITE_TOKEN=... ANDROID_HOME=... node scripts/publish-android-release.mjs app.apk notes.json",
  );
const tools = resolve(process.env.ANDROID_HOME, "build-tools/35.0.0");
const certificate = execFileSync(
  resolve(tools, "apksigner"),
  ["verify", "--print-certs", resolve(apkPath)],
  { encoding: "utf8" },
);
const allowed = JSON.parse(
  await readFile("assetlinks.json", "utf8"),
)[0].target.sha256_cert_fingerprints.map((x) =>
  x.replaceAll(":", "").toLowerCase(),
);
const digest = certificate
  .match(/certificate SHA-256 digest: ([a-f0-9]+)/i)?.[1]
  .toLowerCase();
if (!allowed.includes(digest))
  throw new Error("APK signing certificate does not match our application");
const badging = execFileSync(
  resolve(tools, "aapt"),
  ["dump", "badging", resolve(apkPath)],
  { encoding: "utf8" },
);
const info = badging.match(
  /package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/,
);
if (!info || info[1] !== "co.calendario21.app")
  throw new Error("Unexpected Android package");
const apk = await readFile(apkPath);
if (apk.length > 50 * 1024 * 1024)
  throw new Error("APK exceeds update size limit");
const sha256 = createHash("sha256").update(apk).digest("hex");
const versionCode = Number(info[2]);
let previous = null;
try {
  previous = JSON.parse(await readFile("android-release.json", "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (
  previous &&
  (versionCode < previous.versionCode ||
    (versionCode === previous.versionCode && sha256 !== previous.sha256))
)
  throw new Error("Increment versionCode before publishing a different APK");
const notes = JSON.parse(await readFile(notesPath, "utf8"));
if (
  !Array.isArray(notes) ||
  !notes.length ||
  notes.length > 12 ||
  notes.some((x) => typeof x !== "string" || x.length > 500)
)
  throw new Error("Invalid release notes");
const pathname = `android/nuestro-calendario-21-v${versionCode}.apk`;
let blob;
try {
  blob = await put(pathname, apk, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: false,
    contentType: "application/vnd.android.package-archive",
    cacheControlMaxAge: 31536000,
  });
} catch (error) {
  // Re-running the same release is safe only if the immutable remote file matches.
  if (!String(error.message).includes("already exists")) throw error;
  blob = await head(pathname);
}
const url = new URL(blob.url);
if (previous && new URL(previous.apkUrl).hostname !== url.hostname)
  throw new Error(
    "Keep the configured download store for installed Android clients",
  );
if (
  url.protocol !== "https:" ||
  !url.hostname.endsWith(".public.blob.vercel-storage.com")
)
  throw new Error("Unexpected download host");
const response = await fetch(url, { cache: "no-store" });
if (!response.ok) throw new Error("Uploaded APK is not downloadable");
const remote = Buffer.from(await response.arrayBuffer());
if (
  remote.length !== apk.length ||
  createHash("sha256").update(remote).digest("hex") !== sha256
)
  throw new Error("Remote APK verification failed");
const manifest = {
  format: 1,
  packageName: info[1],
  versionCode,
  versionName: info[3],
  apkUrl: url.href,
  sha256,
  bytes: apk.length,
  minSdk: 26,
  publishedAt: new Date().toISOString(),
  notes,
};
// Update visibility only after the file is downloadable and has been verified.
await writeFile(
  "android-release.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest));
