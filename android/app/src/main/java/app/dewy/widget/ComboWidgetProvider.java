package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import app.dewy.R;

// D-Day + 체크리스트 콤보 위젯(3×1~4×2). 탭 → 일정(app.dewy://schedule).
public class ComboWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetData d = WidgetData.load(ctx);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_combo);
            v.setTextViewText(R.id.tv_dday, d.ddayText());
            v.setTextViewText(R.id.tv_checklist, d.checklistText());
            v.setProgressBar(R.id.pb_checklist, 100, d.checklistPercent(), false);
            v.setOnClickPendingIntent(R.id.widget_root,
                Widgets.deepLink(ctx, "app.dewy://schedule", 1001));
            mgr.updateAppWidget(id, v);
        }
    }
}
