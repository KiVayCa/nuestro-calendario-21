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
// The calendar cards often use white surfaces; the widget uses the softer
// theme color when that surface is light, preserving the dark palettes.
const channels = (hex) => {
  const value = hex.slice(1);
  const rgb =
    value.length === 3 ? [...value].map((c) => c + c).join("") : value;
  return [0, 2, 4].map((offset) => parseInt(rgb.slice(offset, offset + 2), 16));
};
const luminance = (hex) =>
  channels(hex).reduce((total, channel, index) => {
    const value = channel / 255;
    const linear =
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    return total + linear * [0.2126, 0.7152, 0.0722][index];
  }, 0);
const contrast = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
for (const colors of Object.values(themes)) {
  const softer = luminance(colors.soft);
  colors.widgetBackground =
    luminance(colors.surface) > 0.45 &&
    contrast(softer, luminance(colors.ink)) >= 4.5
      ? colors.soft
      : colors.surface;
}

await mkdir("android/app/src/main/assets", { recursive: true });
let java =
  "package co.calendario21.app;\n\n// Generated from styles.css by scripts/build-widget-themes.mjs.\nfinal class WidgetThemeResources {\n";
for (const [method, prefix, field] of [
  ["background", "widget_theme", "widgetBackground"],
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
