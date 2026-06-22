package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import app.dewy.R;

// D-Day 위젯(2×1~4×1). 탭 → 일정, '추가' → 일정 빠른추가(app.dewy://schedule/new).
public class DdayWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetData d = WidgetData.load(ctx);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_dday);
            v.setTextViewText(R.id.tv_dday, d.ddayText());
            v.setOnClickPendingIntent(R.id.widget_root,
                Widgets.deepLink(ctx, "app.dewy://schedule", 1002));
            v.setOnClickPendingIntent(R.id.btn_add,
                Widgets.deepLink(ctx, "app.dewy://schedule/new", 1003));
            mgr.updateAppWidget(id, v);
        }
    }
}
