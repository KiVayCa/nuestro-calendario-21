import { readFile, writeFile, mkdir } from "node:fs/promises";
const css = await readFile("styles.css", "utf8");
const themes = {};
for (const match of css.matchAll(
  /body\[data-theme=["']([a-z]+)["']\]\s*\{([^}]+)\}/g,
)) {
  const values = (themes[match[1]] ??= {});
  for (const property of match[2].matchAll(
    /--([a-z]+)\s*:\s*(#[a-fA-F0-9]{3,8})\s*[;}]/g,
  ))
    values[property[1]] = property[2];
  // The last declaration can end at the closing brace (outside the capture).
  for (const property of match[2].matchAll(
    /--([a-z]+)\s*:\s*(#[a-fA-F0-9]{3,8})(?=\s*(?:;|$))/g,
  ))
    values[property[1]] = property[2];
}
await mkdir("android/app/src/main/assets", { recursive: true });
let java =
  "package co.calendario21.app;\n\n// Generated from styles.css by scripts/build-widget-themes.mjs.\nfinal class WidgetThemeResources {\n";
for (const [method, prefix, field] of [
  ["background", "widget_theme", "surface"],
  ["today", "widget_today", "soft"],
  ["event", "widget_event", "soft"],
]) {
  java += `  static int ${method}(String theme) {\n    switch(theme) {\n`;
  for (const [name, colors] of Object.entries(themes)) {
    if (
      !["rose", "soft", "ink", "muted", "line", "surface"].every(
        (k) => colors[k],
      )
    )
      throw Error("Incomplete widget theme: " + name);
    const filename = `${prefix}_${name}`;
    const root = method === "background";
    await writeFile(
      `android/app/src/main/res/drawable/${filename}.xml`,
      `<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="${colors[field]}"/><corners android:radius="${root ? 24 : 4}dp"/><stroke android:width="${method === "today" ? 2 : root ? 1 : 0}dp" android:color="${colors[method === "today" ? "rose" : "line"]}"/></shape>\n`,
    );
    java += `      case "${name}": return R.drawable.${filename};\n`;
  }
  java += `      default: return R.drawable.${prefix}_romance;\n    }\n  }\n`;
}
java += "}\n";
await writeFile(
  "android/app/src/main/java/co/calendario21/app/WidgetThemeResources.java",
  java,
);
await writeFile(
  "android/app/src/main/assets/widget-themes.json",
  JSON.stringify(themes, null, 2) + "\n",
);
console.log(
  `Generated ${Object.keys(themes).length} widget themes from the app palette.`,
);
