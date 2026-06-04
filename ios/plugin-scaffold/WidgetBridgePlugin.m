// Capacitor 플러그인 등록 매크로(Objective-C 브리지).
// `npx cap add ios` 후 App 타깃에 WidgetBridgePlugin.swift 와 함께 추가한다.

#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(WidgetBridgePlugin, "WidgetBridge",
           CAP_PLUGIN_METHOD(updateWidgets, CAPPluginReturnPromise);
)
