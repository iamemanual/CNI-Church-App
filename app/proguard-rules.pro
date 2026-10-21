# ProGuard rules for Church Companion
-keepattributes JavascriptInterface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.allsaints.church.WebAppBridgeInterface { *; }
-keep class com.allsaints.church.engine.** { *; }
