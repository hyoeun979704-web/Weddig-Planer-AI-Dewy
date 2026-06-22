import WidgetKit
import SwiftUI

// Dewy 홈 위젯 묶음(4종) + SwiftUI 뷰. 탭/추가는 app.dewy:// 딥링크(Android 와 동일).
// 설계·위젯 스펙: docs/widget-system.md. 적용: docs/ios-widgets/README.md.

private let dewyPink = Color(red: 246/255, green: 144/255, blue: 155/255)
private let dewyMuted = Color(red: 138/255, green: 138/255, blue: 138/255)
private let dewyTrack = Color(red: 239/255, green: 239/255, blue: 239/255)

// iOS17+ 위젯은 containerBackground 필수. 하위 호환 위해 분기.
private extension View {
    @ViewBuilder func dewyBackground() -> some View {
        if #available(iOS 17.0, *) {
            self.containerBackground(.white, for: .widget)
        } else {
            self.background(Color.white)
        }
    }
}

private struct Bar: View {
    let fraction: Double
    var body: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule().fill(dewyTrack)
                Capsule().fill(dewyPink).frame(width: max(0, geo.size.width * fraction))
            }
        }
        .frame(height: 6)
    }
}

// ── 콤보(D-Day + 체크리스트) → 일정 ───────────────────────────────
struct ComboWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyComboWidget", provider: DewyProvider()) { entry in
            let s = entry.snapshot
            VStack(alignment: .leading, spacing: 6) {
                Text("결혼까지").font(.caption2).foregroundColor(dewyMuted)
                Text(s.ddayText).font(.system(size: 30, weight: .bold)).foregroundColor(dewyPink)
                Spacer(minLength: 2)
                Text(s.checklistText).font(.footnote).foregroundColor(.primary)
                Bar(fraction: s.checklistFraction)
            }
            .padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "app.dewy://schedule"))
            .dewyBackground()
        }
        .configurationDisplayName("D-Day + 체크리스트")
        .description("결혼까지 남은 일수와 할 일 진행률")
        .supportedFamilies([.systemMedium])
    }
}

// ── D-Day → 일정, '추가' → 일정 빠른추가 ──────────────────────────
struct DdayWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyDdayWidget", provider: DewyProvider()) { entry in
            let s = entry.snapshot
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("결혼까지").font(.caption2).foregroundColor(dewyMuted)
                    Text(s.ddayText).font(.system(size: 26, weight: .bold)).foregroundColor(dewyPink)
                }
                Spacer()
                Link(destination: URL(string: "app.dewy://schedule/new")!) {
                    Text("+ 일정").font(.caption).bold().foregroundColor(dewyPink)
                        .padding(.horizontal, 10).padding(.vertical, 6)
                        .background(dewyPink.opacity(0.15)).clipShape(Capsule())
                }
            }
            .padding(14).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "app.dewy://schedule"))
            .dewyBackground()
        }
        .configurationDisplayName("D-Day")
        .description("결혼까지 남은 일수")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ── 체크리스트(할 일 완료율) → 보드 ───────────────────────────────
struct ChecklistWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyChecklistWidget", provider: DewyProvider()) { entry in
            let s = entry.snapshot
            VStack(alignment: .leading, spacing: 8) {
                Text("결혼 준비 체크리스트").font(.caption2).foregroundColor(dewyMuted)
                Text(s.checklistText).font(.headline).foregroundColor(.primary)
                Bar(fraction: s.checklistFraction)
            }
            .padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "app.dewy://vendor-board"))
            .dewyBackground()
        }
        .configurationDisplayName("결혼 준비 체크리스트")
        .description("할 일 진행률")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

// ── 예산(사용/전체) → 예산, '추가' → 지출 빠른추가 ────────────────
struct BudgetWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "DewyBudgetWidget", provider: DewyProvider()) { entry in
            let s = entry.snapshot
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("웨딩 예산").font(.caption2).foregroundColor(dewyMuted)
                    Spacer()
                    Link(destination: URL(string: "app.dewy://budget/new")!) {
                        Text("+ 지출").font(.caption2).bold().foregroundColor(dewyPink)
                            .padding(.horizontal, 9).padding(.vertical, 4)
                            .background(dewyPink.opacity(0.15)).clipShape(Capsule())
                    }
                }
                Text(s.budgetText).font(.subheadline).bold().foregroundColor(.primary)
                Bar(fraction: s.budgetFraction)
            }
            .padding(16).frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
            .widgetURL(URL(string: "app.dewy://budget"))
            .dewyBackground()
        }
        .configurationDisplayName("웨딩 예산")
        .description("사용 예산과 진행률")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct DewyWidgets: WidgetBundle {
    var body: some Widget {
        ComboWidget()
        DdayWidget()
        ChecklistWidget()
        BudgetWidget()
    }
}
