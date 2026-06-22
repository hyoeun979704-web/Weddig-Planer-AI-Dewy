package app.dewy.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;

// 위젯 공용 유틸 — 전체 위젯 갱신 + 딥링크 PendingIntent. 설계: docs/widget-system.md.
public class Widgets {

    private static final Class<?>[] PROVIDERS = {
        ComboWidgetProvider.class,
        DdayWidgetProvider.class,
        ChecklistWidgetProvider.class,
        BudgetWidgetProvider.class,
    };

    /** 설치된 4종 위젯을 모두 갱신(스냅샷 변경 후 호출). */
    public static void updateAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        for (Class<?> provider : PROVIDERS) {
            ComponentName cn = new ComponentName(ctx, provider);
            int[] ids = mgr.getAppWidgetIds(cn);
            if (ids != null && ids.length > 0) {
                Intent intent = new Intent(ctx, provider);
                intent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
                intent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
                ctx.sendBroadcast(intent);
            }
        }
    }

    /** app.dewy://... 딥링크를 우리 앱(MainActivity)으로 여는 PendingIntent. */
    public static PendingIntent deepLink(Context ctx, String uri, int reqCode) {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(uri));
        intent.setPackage(ctx.getPackageName()); // 우리 앱이 처리(외부 앱 가로채기 방지).
        intent.addCategory(Intent.CATEGORY_BROWSABLE);
        // FLAG_IMMUTABLE 은 API 23+ 사용 가능(minSdk 23), API 31+ 필수.
        int flags = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(ctx, reqCode, intent, flags);
    }
}
