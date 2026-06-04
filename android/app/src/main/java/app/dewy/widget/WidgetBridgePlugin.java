package app.dewy.widget;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * JS ↔ 네이티브 위젯 브리지. src/lib/native/widgetSync.ts 의 registerPlugin('WidgetBridge')
 * 와 1:1 대응. payload(JSON 문자열)를 받아 SharedPreferences 에 저장하고 위젯을 갱신한다.
 */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {

    @PluginMethod
    public void updateWidgets(PluginCall call) {
        String payload = call.getString("payload", "{}");
        WidgetStore.writePayload(getContext(), payload);
        WidgetStore.updateAll(getContext());
        call.resolve();
    }
}
