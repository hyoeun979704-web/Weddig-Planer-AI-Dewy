import WidgetKit

// 위젯 타임라인 — 스냅샷 1개 엔트리. D-Day 가 자정에 바뀌므로 다음 자정에 갱신 예약.
// (실시간 변경은 앱이 resume/pause 시 WidgetCenter.reloadAllTimelines 로 별도 푸시.)
struct SnapshotEntry: TimelineEntry {
    let date: Date
    let snapshot: WidgetSnapshot
}

struct DewyProvider: TimelineProvider {
    func placeholder(in context: Context) -> SnapshotEntry {
        SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load())
    }

    func getSnapshot(in context: Context, completion: @escaping (SnapshotEntry) -> Void) {
        completion(SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SnapshotEntry>) -> Void) {
        let entry = SnapshotEntry(date: Date(), snapshot: WidgetSnapshot.load())
        let nextMidnight = Calendar.current.startOfDay(for: Date().addingTimeInterval(86_400))
        completion(Timeline(entries: [entry], policy: .after(nextMidnight)))
    }
}
