package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import app.dewy.R;

// 예산 위젯(2×2~4×2). 표시 = 사용/전체, 탭 → 예산, '추가' → 지출 빠른추가(app.dewy://budget/new).
public class BudgetWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        WidgetData d = WidgetData.load(ctx);
        for (int id : ids) {
            RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_budget);
            v.setTextViewText(R.id.tv_budget, d.budgetText());
            v.setProgressBar(R.id.pb_budget, 100, d.budgetPercent(), false);
            v.setOnClickPendingIntent(R.id.widget_root,
                Widgets.deepLink(ctx, "app.dewy://budget", 1005));
            v.setOnClickPendingIntent(R.id.btn_add,
                Widgets.deepLink(ctx, "app.dewy://budget/new", 1006));
            mgr.updateAppWidget(id, v);
        }
    }
}
