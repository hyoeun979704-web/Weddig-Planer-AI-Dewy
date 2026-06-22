package app.dewy.widget;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

// 홈 위젯 공용 데이터 — 웹앱(WidgetBridgePlugin)이 써둔 스냅샷(JSON)을 읽어 표시 값으로 가공.
// minSdk 23 이라 java.time 대신 Calendar 사용. 설계: docs/widget-system.md.
public class WidgetData {
    public static final String PREFS = "dewy.widget";
    public static final String KEY_SNAPSHOT = "snapshot";

    public String weddingDate;      // "yyyy-MM-dd" | null(미설정/TBD)
    public int checklistDone;
    public int checklistTotal;
    public long budgetUsedManwon;
    public long budgetTotalManwon;

    public static WidgetData load(Context ctx) {
        WidgetData d = new WidgetData();
        try {
            SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
            String raw = sp.getString(KEY_SNAPSHOT, null);
            if (raw == null) return d;
            JSONObject o = new JSONObject(raw);
            String wd = o.optString("weddingDate", null);
            d.weddingDate = (wd == null || wd.isEmpty() || "null".equals(wd)) ? null : wd;
            JSONObject c = o.optJSONObject("checklist");
            if (c != null) {
                d.checklistDone = c.optInt("done", 0);
                d.checklistTotal = c.optInt("total", 0);
            }
            JSONObject b = o.optJSONObject("budget");
            if (b != null) {
                d.budgetUsedManwon = b.optLong("usedManwon", 0);
                d.budgetTotalManwon = b.optLong("totalManwon", 0);
            }
        } catch (Exception ignored) {
            // 파싱 실패 — 기본값(빈 안내)로 폴백.
        }
        return d;
    }

    /** 예식일까지 남은 일수. 미설정이면 null. (양수=남음, 0=당일, 음수=지남) */
    public Integer daysUntilWedding() {
        if (weddingDate == null) return null;
        try {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            sdf.setTimeZone(TimeZone.getDefault());
            Date wd = sdf.parse(weddingDate);
            if (wd == null) return null;
            Calendar wedding = atMidnight(wd);
            Calendar today = atMidnight(new Date());
            long diff = wedding.getTimeInMillis() - today.getTimeInMillis();
            return (int) Math.round(diff / 86400000.0); // DST 보정 위해 round.
        } catch (Exception e) {
            return null;
        }
    }

    /** "D-365" / "D-DAY" / "D+5" / "예식일 미정". */
    public String ddayText() {
        Integer days = daysUntilWedding();
        if (days == null) return "예식일 미정";
        if (days == 0) return "D-DAY";
        return days > 0 ? ("D-" + days) : ("D+" + (-days));
    }

    public int checklistPercent() {
        if (checklistTotal <= 0) return 0;
        return Math.min(100, Math.round(checklistDone * 100f / checklistTotal));
    }

    public int budgetPercent() {
        if (budgetTotalManwon <= 0) return 0;
        return Math.min(100, Math.round(budgetUsedManwon * 100f / budgetTotalManwon));
    }

    /** "12 / 30 완료" 또는 안내. */
    public String checklistText() {
        if (checklistTotal <= 0) return "할 일을 추가해보세요";
        return checklistDone + " / " + checklistTotal + " 완료";
    }

    /** "1,234 / 5,000만원" 또는 안내. */
    public String budgetText() {
        if (budgetTotalManwon <= 0) return "예산을 설정해보세요";
        return comma(budgetUsedManwon) + " / " + comma(budgetTotalManwon) + "만원";
    }

    private static Calendar atMidnight(Date date) {
        Calendar c = Calendar.getInstance();
        c.setTime(date);
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c;
    }

    private static String comma(long n) {
        return String.format(Locale.US, "%,d", n);
    }
}
