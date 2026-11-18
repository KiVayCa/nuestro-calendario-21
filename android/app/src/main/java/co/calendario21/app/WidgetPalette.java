package co.calendario21.app;

import org.json.JSONObject;

/** Colors generated from the same CSS theme definitions used by the web calendar. */
final class WidgetPalette {
  final String name;
  final int ink, muted, accent, surface;

  WidgetPalette(JSONObject themes, JSONObject settings, String frame) throws Exception {
    String selected =
        frame.equals("app")
            ? settings.optString("theme", "romance")
            : frame.equals("rose") ? "romance" : frame;
    name = themes.has(selected) ? selected : "romance";
    JSONObject theme = themes.getJSONObject(name);
    ink = color(theme.getString("ink"));
    muted = color(theme.optString("widgetMuted", theme.getString("muted")));
    surface = color(theme.getString("surface"));
    String custom = settings.optString("accent_color", "");
    accent =
        color(
            frame.equals("app") && custom.matches("#[a-fA-F0-9]{6}")
                ? custom
                : theme.getString("rose"));
  }

  static int color(String value) {
    if (value.matches("#[a-fA-F0-9]{3}"))
      value =
          "#"
              + value.charAt(1)
              + value.charAt(1)
              + value.charAt(2)
              + value.charAt(2)
              + value.charAt(3)
              + value.charAt(3);
    if (!value.matches("#[a-fA-F0-9]{6}"))
      throw new IllegalArgumentException("Invalid theme color");
    return (int) (0xff000000L | Long.parseLong(value.substring(1), 16));
  }
}
