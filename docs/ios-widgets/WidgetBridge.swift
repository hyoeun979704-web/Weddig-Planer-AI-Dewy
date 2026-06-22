import Foundation
import Capacitor
import WidgetKit

// 웹앱 ↔ 홈 위젯 다리(Capacitor 플러그인, 앱 타깃). 웹이 보낸 스냅샷(JSON)을 App Group
// UserDefaults 에 저장하고 위젯 타임라인을 리로드한다. 웹 IF: src/lib/native/widgetBridge.ts.
// 등록은 WidgetBridge.m 의 CAP_PLUGIN 매크로가 담당(코드 등록 불필요). 설계: docs/widget-system.md.
@objc(WidgetBridge)
public class WidgetBridge: CAPPlugin {
    static let appGroup = "group.app.dewy.widget"
    static let key = "snapshot"

    @objc func update(_ call: CAPPluginCall) {
        guard let snapshot = call.getString("snapshot") else {
            call.reject("snapshot is required")
            return
        }
        UserDefaults(suiteName: WidgetBridge.appGroup)?.set(snapshot, forKey: WidgetBridge.key)
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
