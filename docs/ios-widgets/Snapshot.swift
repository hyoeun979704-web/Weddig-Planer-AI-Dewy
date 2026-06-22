import Foundation

// 홈 위젯 공용 데이터 — 앱(WidgetBridge)이 App Group UserDefaults 에 써둔 스냅샷(JSON)을 읽어
// 표시 값으로 가공. Android WidgetData.java 와 동일 스키마. 설계: docs/widget-system.md.
struct WidgetSnapshot {
    var weddingDate: String?      // "yyyy-MM-dd" | nil
    var checklistDone: Int = 0
    var checklistTotal: Int = 0
    var budgetUsedManwon: Int = 0
    var budgetTotalManwon: Int = 0

    static let appGroup = "group.app.dewy.widget"
    static let key = "snapshot"

    static func load() -> WidgetSnapshot {
        var snap = WidgetSnapshot()
        guard
            let raw = UserDefaults(suiteName: appGroup)?.string(forKey: key),
            let data = raw.data(using: .utf8),
            let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
        else { return snap }

        if let wd = obj["weddingDate"] as? String, !wd.isEmpty { snap.weddingDate = wd }
        if let c = obj["checklist"] as? [String: Any] {
            snap.checklistDone = c["done"] as? Int ?? 0
            snap.checklistTotal = c["total"] as? Int ?? 0
        }
        if let b = obj["budget"] as? [String: Any] {
            snap.budgetUsedManwon = b["usedManwon"] as? Int ?? 0
            snap.budgetTotalManwon = b["totalManwon"] as? Int ?? 0
        }
        return snap
    }

    var daysUntilWedding: Int? {
        guard let wd = weddingDate else { return nil }
        let fmt = DateFormatter()
        fmt.dateFormat = "yyyy-MM-dd"
        fmt.timeZone = TimeZone.current
        guard let date = fmt.date(from: wd) else { return nil }
        let cal = Calendar.current
        return cal.dateComponents([.day], from: cal.startOfDay(for: Date()), to: cal.startOfDay(for: date)).day
    }

    var ddayText: String {
        guard let d = daysUntilWedding else { return "예식일 미정" }
        if d == 0 { return "D-DAY" }
        return d > 0 ? "D-\(d)" : "D+\(-d)"
    }

    var checklistText: String {
        checklistTotal <= 0 ? "할 일을 추가해보세요" : "\(checklistDone) / \(checklistTotal) 완료"
    }
    var checklistFraction: Double {
        checklistTotal <= 0 ? 0 : min(1, Double(checklistDone) / Double(checklistTotal))
    }

    var budgetText: String {
        budgetTotalManwon <= 0 ? "예산을 설정해보세요" : "\(comma(budgetUsedManwon)) / \(comma(budgetTotalManwon))만원"
    }
    var budgetFraction: Double {
        budgetTotalManwon <= 0 ? 0 : min(1, Double(budgetUsedManwon) / Double(budgetTotalManwon))
    }

    private func comma(_ n: Int) -> String {
        let f = NumberFormatter()
        f.numberStyle = .decimal
        return f.string(from: NSNumber(value: n)) ?? "\(n)"
    }
}
