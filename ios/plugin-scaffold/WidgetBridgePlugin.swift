// iOS WidgetBridge 플러그인 (앱 본체 타깃용 스캐폴딩).
//
// ⚠️ `npx cap add ios` 로 ios/App 프로젝트를 만든 뒤, 이 파일과 .m 을
//    App 타깃에 추가한다. JS 의 registerPlugin('WidgetBridge') 와 1:1 대응.
//    payload(JSON 문자열)를 App Group UserDefaults 에 저장하고 위젯을 리로드한다.
//    App 타깃 + 위젯 타깃 모두 App Group "group.app.dewy" 를 활성화해야 한다.

import Foundation
import Capacitor
import WidgetKit

@objc(WidgetBridgePlugin)
public class WidgetBridgePlugin: CAPPlugin {
    private let appGroupId = "group.app.dewy"
    private let payloadKey = "payload"

    @objc func updateWidgets(_ call: CAPPluginCall) {
        let payload = call.getString("payload") ?? "{}"
        if let defaults = UserDefaults(suiteName: appGroupId) {
            defaults.set(payload, forKey: payloadKey)
        }
        if #available(iOS 14.0, *) {
            WidgetCenter.shared.reloadAllTimelines()
        }
        call.resolve()
    }
}
