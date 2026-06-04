package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.view.View;
import android.widget.RemoteViews;

import org.json.JSONArray;
import org.json.JSONObject;

import app.dewy.R;

/** 일정 위젯 — 다가오는 웨딩 준비 일정 최대 3건. */
public class ScheduleWidgetProvider extends AppWidgetProvider {
    private static final int[] TITLE_IDS = {
        R.id.widget_sched_1, R.id.widget_sched_2, R.id.widget_sched_3
    };
    private static final int[] DATE_IDS = {
        R.id.widget_sched_1_d, R.id.widget_sched_2_d, R.id.widget_sched_3_d
    };

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        JSONObject data = WidgetStore.read(ctx);
        JSONArray schedule = data.optJSONArray("schedule");

        for (int id : ids) {
            RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_schedule);
            int count = schedule == null ? 0 : schedule.length();

            views.setViewVisibility(
                R.id.widget_sched_empty, count == 0 ? View.VISIBLE : View.GONE);

            for (int i = 0; i < TITLE_IDS.length; i++) {
                if (i < count) {
                    JSONObject item = schedule.optJSONObject(i);
                    String title = item == null ? "" : item.optString("title", "");
                    String dateLabel = item == null ? "" : item.optString("dateLabel", "");
                    views.setViewVisibility(TITLE_IDS[i], View.VISIBLE);
                    views.setViewVisibility(DATE_IDS[i], View.VISIBLE);
                    views.setTextViewText(TITLE_IDS[i], title);
                    views.setTextViewText(DATE_IDS[i], dateLabel);
                } else {
                    views.setViewVisibility(TITLE_IDS[i], View.GONE);
                    views.setViewVisibility(DATE_IDS[i], View.GONE);
                }
            }
            views.setOnClickPendingIntent(R.id.widget_sched_root, WidgetStore.openAppIntent(ctx));
            mgr.updateAppWidget(id, views);
        }
    }
}
