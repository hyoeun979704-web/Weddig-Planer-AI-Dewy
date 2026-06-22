package app.dewy.widget;

import android.content.Context;
import android.content.SharedPreferences;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

// 웹앱 ↔ 홈 위젯 다리(Capacitor 플러그인). 웹이 보낸 스냅샷(JSON)을 SharedPreferences 에 저장하고
// 설치된 위젯을 즉시 갱신한다. 등록: MainActivity.registerPlugin(WidgetBridgePlugin.class).
// 웹 인터페이스: src/lib/native/widgetBridge.ts (name="WidgetBridge"). 설계: docs/widget-system.md.
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void update(PluginCall call) {
        String snapshot = call.getString("snapshot");
        if (snapshot == null) {
            call.reject("snapshot is required");
            return;
        }
        Context ctx = getContext().getApplicationContext();
        SharedPreferences sp = ctx.getSharedPreferences(WidgetData.PREFS, Context.MODE_PRIVATE);
        sp.edit().putString(WidgetData.KEY_SNAPSHOT, snapshot).apply();
        Widgets.updateAll(ctx);
        call.resolve();
    }
}
