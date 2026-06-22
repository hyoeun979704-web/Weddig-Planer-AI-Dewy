#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

// Capacitor 플러그인 등록(ObjC 브리지). 웹의 registerPlugin("WidgetBridge") 와 name 일치.
CAP_PLUGIN(WidgetBridge, "WidgetBridge",
    CAP_PLUGIN_METHOD(update, CAPPluginReturnPromise);
)
