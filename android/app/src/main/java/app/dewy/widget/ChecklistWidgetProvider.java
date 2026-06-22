package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import app.dewy.R;

// 체크리스트 위젯(2×2~4×2). 표시 = 할 일 완료율, 탭 → 보드(app.dewy://vendor-board).
public class ChecklistWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetData d = WidgetData.load(ctx);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_checklist);
            v.setTextViewText(R.id.tv_checklist, d.checklistText());
            v.setProgressBar(R.id.pb_checklist, 100, d.checklistPercent(), false);
            v.setOnClickPendingIntent(R.id.widget_root,
                Widgets.deepLink(ctx, "app.dewy://vendor-board", 1004));
            mgr.updateAppWidget(id, v);
        }
    }
}
