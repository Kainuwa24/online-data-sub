# Capacitor + Google Sign-In + Biometric (used if minifyEnabled is turned on later)

-keepattributes SourceFile,LineNumberTable
-keepattributes *Annotation*
-keepattributes Signature
-keepattributes Exceptions

# Capacitor bridge
-keep class com.getcapacitor.** { *; }
-keep class app.onlinedatasub.mobile.** { *; }
-dontwarn com.getcapacitor.**

# Google Sign-In / Play services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# AndroidX Biometric
-keep class androidx.biometric.** { *; }

