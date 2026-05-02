# Add project specific ProGuard rules here.
# By default, flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Add any project specific keep options here:

# Remove unused React Native and SQLite code to shrink bundle
-keep class com.reactnativequicksqlite.** { *; }

# React Native optimizations (remove unused debug code)
-assumenosideeffects class android.util.Log {
    public static int v(...);
    public static int d(...);
    public static int i(...);
    public static int w(...);
    public static int e(...);
    public static int wtf(...);
}

# Keep SQLite native methods
-keepclasseswithmembernames class * { native <methods>; }

# Aggressive R8 optimizations to shrink dex size
-repackageclasses ''
-allowaccessmodification
