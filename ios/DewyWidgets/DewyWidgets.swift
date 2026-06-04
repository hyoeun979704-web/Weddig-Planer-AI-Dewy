// Dewy 홈 화면 위젯 (iOS WidgetKit) — D-day / 일정 / 예산.
//
// ⚠️ 스캐폴딩: 이 환경(Linux)에서는 빌드할 수 없다. macOS + Xcode 에서
//    `npx cap add ios` 후 Widget Extension 타깃(DewyWidgets)을 추가하고 이 파일을
//    포함시킨다. 자세한 절차는 docs/ios-widget-setup.md.
//
// 데이터 경로: JS(widgetSync.ts) → WidgetBridge 플러그인(iOS Swift)이
//    App Group UserDefaults(suiteName: "group.app.dewy") 의 "payload" 키에 JSON 저장
//    → 이 위젯이 읽어 렌더. Android 와 동일한 payload 스키마.

import WidgetKit
import SwiftUI

// MARK: - 공유 데이터 모델 (widgetSync.ts 의 WidgetPayload 와 일치)

private let appGroupId = "group.app.dewy"
private let payloadKey = "payload"

struct DdayInfo: Decodable { let label: String; let dateText: String }
struct ScheduleEntryData: Decodable { let title: String; let dateLabel: String }
struct BudgetInfo: Decodable { let spent: Double; let total: Double; let remaining: Double }
struct WidgetPayload: Decodable {
    let dday: DdayInfo?
    let schedule: [ScheduleEntryData]?
    let budget: BudgetInfo?
}

func readPayload() -> WidgetPayload? {
    guard let defaults = UserDefaults(suiteName: appGroupId),
          let raw = defaults.string(forKey: payloadKey),
          let data = raw.data(using: .utf8) else { return nil }
    return try? JSONDecoder().decode(WidgetPayload.self, from: data)
}

private func wonFormat(_ value: Double) -> String {
    let fmt = NumberFormatter()
    fmt.numberStyle = .decimal
    fmt.locale = Locale(identifier: "ko_KR")
    return (fmt.string(from: NSNumber(value: value)) ?? "0") + "원"
}

private let accent = Color(red: 0.84, green: 0.20, blue: 0.42)

// MARK: - Timeline

struct DewyEntry: TimelineEntry {
    let date: Date
    let payload: WidgetPayload?
}

struct DewyProvider: TimelineProvider {
    func placeholder(in context: Context) -> DewyEntry { DewyEntry(date: Date(), payload: nil) }
    func getSnapshot(in context: Context, completion: @escaping (DewyEntry) -> Void) {
        completion(DewyEntry(date: Date(), payload: readPayload()))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<DewyEntry>) -> Void) {
        let entry = DewyEntry(date: Date(), payload: readPayload())
        // 데이터는 앱이 능동적으로 갱신(App Group). 하루 단위로만 자체 리프레시.
        let next = Calendar.current.date(byAdding: .hour, value: 6, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

// MARK: - D-day 위젯

struct DdayWidgetView: View {
    var entry: DewyEntry
    var body: some View {
        VStack(spacing: 4) {
            Text("우리 결혼식까지").font(.caption2).foregroundColor(.secondary)
            Text(entry.payload?.dday?.label ?? "D-?")
                .font(.system(size: 34, weight: .bold)).foregroundColor(accent)
            Text(entry.payload?.dday?.dateText ?? "결혼식 날짜를 등록해 주세요")
                .font(.caption2).foregroundColor(.secondary)
        }.frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct DdayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyDdayWidget", provider: DewyProvider()) { entry in
            DdayWidgetView(entry: entry)
        }
        .configurationDisplayName("Dewy D-day")
        .description("결혼식까지 남은 날을 보여줘요.")
        .supportedFamilies([.systemSmall])
    }
}

// MARK: - 일정 위젯

struct ScheduleWidgetView: View {
    var entry: DewyEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("다가오는 일정").font(.caption).bold().foregroundColor(accent)
            let items = entry.payload?.schedule ?? []
            if items.isEmpty {
                Text("다가오는 일정이 없어요").font(.caption2).foregroundColor(.secondary)
            } else {
                ForEach(Array(items.prefix(3).enumerated()), id: \.offset) { _, it in
                    HStack(spacing: 6) {
                        Text(it.dateLabel).font(.caption2).bold().foregroundColor(accent).frame(width: 40, alignment: .leading)
                        Text(it.title).font(.caption2).lineLimit(1)
                    }
                }
            }
            Spacer(minLength: 0)
        }.padding(12).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct ScheduleWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyScheduleWidget", provider: DewyProvider()) { entry in
            ScheduleWidgetView(entry: entry)
        }
        .configurationDisplayName("Dewy 일정")
        .description("다가오는 웨딩 준비 일정을 보여줘요.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - 예산 위젯

struct BudgetWidgetView: View {
    var entry: DewyEntry
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("예산 현황").font(.caption).bold().foregroundColor(accent)
            if let b = entry.payload?.budget {
                HStack(alignment: .bottom, spacing: 6) {
                    Text(wonFormat(b.spent)).font(.title2).bold()
                    Text("/ " + wonFormat(b.total)).font(.caption2).foregroundColor(.secondary)
                }
                Text(b.remaining >= 0
                     ? "남은 예산 " + wonFormat(b.remaining)
                     : wonFormat(-b.remaining) + " 초과")
                    .font(.caption2).foregroundColor(.secondary)
            } else {
                Text("예산을 설정해 주세요").font(.caption2).foregroundColor(.secondary)
            }
            Spacer(minLength: 0)
        }.padding(12).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
    }
}

struct BudgetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyBudgetWidget", provider: DewyProvider()) { entry in
            BudgetWidgetView(entry: entry)
        }
        .configurationDisplayName("Dewy 예산")
        .description("지출과 남은 예산을 보여줘요.")
        .supportedFamilies([.systemMedium])
    }
}

// MARK: - Bundle

@main
struct DewyWidgetsBundle: WidgetBundle {
    var body: some Widget {
        DdayWidget()
        ScheduleWidget()
        BudgetWidget()
    }
}
