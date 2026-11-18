package co.calendario21.app;

import static org.junit.Assert.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import org.json.*;
import org.junit.Test;

public class WidgetLinkTest {
  @Test public void proofIsRandomAndBoundToVerifier() throws Exception {
    String a=WidgetLinkProof.random(32), b=WidgetLinkProof.random(32);
    assertTrue(a.matches("[a-f0-9]{64}"));
    assertNotEquals(a,b);
    assertEquals("ffe054fe7ae0cb6dc65c3af9b61d5209f439851db43d0ba5997337df154668eb",WidgetLinkProof.challenge("a".repeat(64)));
    assertNotEquals(WidgetLinkProof.challenge(a),WidgetLinkProof.challenge(b));
  }
  @Test public void monthlyEntriesPreserveTitlesTimesAndOccurrenceState() throws Exception {
    JSONObject recurring=new JSONObject().put("id","series").put("title","Iglesia juntos")
      .put("plan_date","2026-11-01").put("plan_time","10:00:00")
      .put("recurrence_enabled",true).put("recurrence_type","weekly")
      .put("completed_occurrences",new JSONArray().put("2026-11-08"))
      .put("cancelled_occurrences",new JSONArray().put("2026-11-15"));
    JSONArray plans=new JSONArray().put(recurring);
    List<WidgetDates.CalendarEntry> completed=WidgetDates.eventsOn(plans,new JSONArray(),LocalDate.parse("2026-11-08"));
    assertEquals(1,completed.size()); assertEquals("Iglesia juntos",completed.get(0).title);
    assertEquals("10:00:00",completed.get(0).time); assertTrue(completed.get(0).completed);
    assertTrue(WidgetDates.eventsOn(plans,new JSONArray(),LocalDate.parse("2026-11-15")).isEmpty());
    assertFalse(WidgetDates.eventsOn(plans,new JSONArray(),LocalDate.parse("2026-11-22")).get(0).completed);
  }
  @Test public void everyAppPaletteHasReadablePrimaryTextAndFallsBackSafely() throws Exception {
    JSONObject themes=new JSONObject(new String(Files.readAllBytes(Paths.get("src/main/assets/widget-themes.json")),java.nio.charset.StandardCharsets.UTF_8));
    assertEquals(34,themes.length());
    for(Iterator<String> names=themes.keys(); names.hasNext();) {
      String name=names.next();
      WidgetPalette p=new WidgetPalette(themes,new JSONObject().put("theme",name),"app");
      assertEquals(name,p.name);
      assertTrue(name+" primary contrast",contrast(p.ink,p.surface)>=4.5);
      assertTrue(name+" event contrast",contrast(p.ink,WidgetPalette.color(themes.getJSONObject(name).getString("soft")))>=4.5);
    }
    assertEquals("romance",new WidgetPalette(themes,new JSONObject().put("theme","invalid"),"app").name);
  }
  private double luminance(int color) {
    double result=0; double[] weights={0.2126,0.7152,0.0722};
    for(int i=0;i<3;i++){double c=((color>>(16-i*8))&255)/255.0;
      result+=weights[i]*(c<=0.04045?c/12.92:Math.pow((c+0.055)/1.055,2.4));}
    return result;
  }
  private double contrast(int a,int b){double x=luminance(a),y=luminance(b);return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);}
}
