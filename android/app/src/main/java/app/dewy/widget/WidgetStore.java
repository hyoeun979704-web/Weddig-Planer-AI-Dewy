package app.dewy.widget;

import android.app.PendingIntent;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.appwidget.AppWidgetManager;

import org.json.JSONObject;

/**
 * 위젯 데이터 저장소 + 갱신 트리거.
 *
 * JS(widgetSync.ts) → WidgetBridgePlugin.updateWidgets() 가 payload(JSON 문자열)를
 * SharedPreferences 에 쓰고 updateAll() 로 세 위젯을 갱신한다. 각 Provider 는
 * read() 로 같은 payload 를 읽어 RemoteViews 를 구성한다.
 */
public final class WidgetStore {
    public static final String PREFS = "dewy_widget_prefs";
    public static final String KEY_PAYLOAD = "payload";

    private WidgetStore() {}

    public static void writePayload(Context ctx, String payload) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        sp.edit().putString(KEY_PAYLOAD, payload == null ? "{}" : payload).apply();
    }

    public static JSONObject read(Context ctx) {
        SharedPreferences sp = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        String raw = sp.getString(KEY_PAYLOAD, "{}");
        try {
            return new JSONObject(raw);
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    /** 세 위젯 모두에 ACTION_APPWIDGET_UPDATE 브로드캐스트 → onUpdate 재실행. */
    public static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        broadcast(ctx, mgr, DdayWidgetProvider.class);
        broadcast(ctx, mgr, ScheduleWidgetProvider.class);
        broadcast(ctx, mgr, BudgetWidgetProvider.class);
    }

    private static void broadcast(Context ctx, AppWidgetManager mgr, Class<?> cls) {
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, cls));
        if (ids == null || ids.length == 0) return;
        Intent intent = new Intent(ctx, cls);
        intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        ctx.sendBroadcast(intent);
    }

    /** 위젯 탭 시 앱을 여는 PendingIntent(런처 인텐트). */
    public static PendingIntent openAppIntent(Context ctx) {
        Intent launch = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
        if (launch == null) {
            launch = new Intent(Intent.ACTION_MAIN);
            launch.addCategory(Intent.CATEGORY_LAUNCHER);
        }
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, 0, launch, flags);
    }
}
