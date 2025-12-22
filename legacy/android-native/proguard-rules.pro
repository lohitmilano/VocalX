# Proguard rules for VocalX

# Keep Android classes
-keep class android.** { *; }
-keep interface android.** { *; }

# Keep Kotlin classes
-keep class kotlin.** { *; }
-keep interface kotlin.** { *; }

# Keep Jetpack Compose
-keep class androidx.compose.** { *; }
-keep interface androidx.compose.** { *; }

# Keep TensorFlow Lite
-keep class org.tensorflow.** { *; }
-keep interface org.tensorflow.** { *; }

# Keep Room database
-keep class androidx.room.** { *; }
-keep interface androidx.room.** { *; }

# Keep Hilt
-keep class dagger.hilt.** { *; }
-keep interface dagger.hilt.** { *; }

# Keep Timber logging
-keep class timber.log.** { *; }

# Keep data classes
-keep class com.vocalx.models.** { *; }
-keep class com.vocalx.data.** { *; }

# Keep coroutines
-keep class kotlinx.coroutines.** { *; }

# Keep Retrofit
-keep class retrofit2.** { *; }
-keep interface retrofit2.** { *; }

# Keep GSON
-keep class com.google.gson.** { *; }
-keep interface com.google.gson.** { *; }

# Keep OkHttp
-keep class okhttp3.** { *; }
-keep interface okhttp3.** { *; }

# Suppress warnings
-dontwarn android.**
-dontwarn androidx.**
-dontwarn kotlin.**
-dontwarn org.tensorflow.**
