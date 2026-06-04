package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import app.dewy.R;

/** D-day 위젯 — 예식일까지 남은 일수. */
public class DdayWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        JSONObject data = WidgetStore.read(ctx);
        JSONObject dday = data.optJSONObject("dday");

        for (int id : ids) {
            RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_dday);
            if (dday != null) {
                views.setTextViewText(R.id.widget_dday_label, dday.optString("label", "D-?"));
                views.setTextViewText(R.id.widget_dday_date, dday.optString("dateText", ""));
            } else {
                views.setTextViewText(R.id.widget_dday_label, "D-?");
                views.setTextViewText(R.id.widget_dday_date, "결혼식 날짜를 등록해 주세요");
            }
            views.setOnClickPendingIntent(R.id.widget_dday_root, WidgetStore.openAppIntent(ctx));
            mgr.updateAppWidget(id, views);
        }
    }
}
