package app.dewy.widget;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.widget.RemoteViews;

import org.json.JSONObject;

import java.text.NumberFormat;
import java.util.Locale;

import app.dewy.R;

/** 예산 위젯 — 지출/총예산/남은 금액. */
public class BudgetWidgetProvider extends AppWidgetProvider {
    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        JSONObject data = WidgetStore.read(ctx);
        JSONObject budget = data.optJSONObject("budget");
        NumberFormat nf = NumberFormat.getInstance(Locale.KOREA);

        for (int id : ids) {
            RemoteViews views = new RemoteViews(ctx.getPackageName(), R.layout.widget_budget);
            if (budget != null) {
                long spent = budget.optLong("spent", 0);
                long total = budget.optLong("total", 0);
                long remaining = budget.optLong("remaining", 0);
                views.setTextViewText(R.id.widget_budget_spent, nf.format(spent) + "원");
                views.setTextViewText(R.id.widget_budget_total, "/ " + nf.format(total) + "원");
                String remainingText = remaining >= 0
                    ? "남은 예산 " + nf.format(remaining) + "원"
                    : nf.format(-remaining) + "원 초과";
                views.setTextViewText(R.id.widget_budget_remaining, remainingText);
            } else {
                views.setTextViewText(R.id.widget_budget_spent, "0원");
                views.setTextViewText(R.id.widget_budget_total, "");
                views.setTextViewText(R.id.widget_budget_remaining, "예산을 설정해 주세요");
            }
            views.setOnClickPendingIntent(R.id.widget_budget_root, WidgetStore.openAppIntent(ctx));
            mgr.updateAppWidget(id, views);
        }
    }
}
