package com.vocalx

/**
 * Deployment configuration for VocalX
 * Controls build variants, feature flags, and deployment settings
 */
object DeploymentConfig {
    // Build configuration
    const val VERSION_NAME = "1.0.0"
    const val VERSION_CODE = 1
    const val MIN_SDK_VERSION = 24
    const val TARGET_SDK_VERSION = 34
    const val COMPILE_SDK_VERSION = 34

    // Feature flags
    const val ENABLE_AUDIO_EFFECTS = true
    const val ENABLE_ADVANCED_ANALYSIS = true
    const val ENABLE_OPENVINO = true
    const val ENABLE_CLOUD_BACKUP = false // Future feature
    const val ENABLE_SUBSCRIPTIONS = false // Future feature

    // Model Configuration - Controls whether to use real models or mocks for development
    const val USE_PRODUCTION_MODELS = false // Set to true for production builds
    const val USE_MOCK_AUDIO_PROCESSING = false // Set to true for UI testing without models
    const val ENABLE_MODEL_DOWNLOAD = true // Allow automatic model downloading
    const val MODEL_DOWNLOAD_ON_DEMAND = true // Download models when needed
    const val MODEL_DOWNLOAD_ON_STARTUP = false // Download models at app startup

    // Performance Monitoring
    const val ENABLE_PERFORMANCE_MONITORING = true
    const val PERFORMANCE_LOGGING_INTERVAL_MS = 1000
    const val MAX_PERFORMANCE_LOGS = 1000

    // Model Configuration
    const val DEMUCS_MODEL_FILE = "demucs_v4_quantized.tflite"
    const val DEMUCS_MODEL_URL = "https://github.com/facebookresearch/demucs/releases/download/v4.0/demucs_v4_quantized.tflite"
    const val DEMUCS_MODEL_SIZE_MB = 120
    const val DEMUCS_MODEL_CHECKSUM = "abc123..." // Replace with actual checksum

    const val OPENVINO_MODEL_FILE = "openvino_model.xml"
    const val OPENVINO_WEIGHTS_FILE = "openvino_model.bin"
    const val OPENVINO_MODEL_URL = "https://storage.openvinotoolkit.org/models_contrib/audio/2023.1/"
    const val OPENVINO_MODEL_SIZE_MB = 50
    const val OPENVINO_MODEL_CHECKSUM = "def456..." // Replace with actual checksum

    // Fallback Configuration
    const val ENABLE_FALLBACK_PROCESSING = true
    const val FALLBACK_TO_CPU = true
    const val FALLBACK_TO_MOCK = false // Only for development

    // API Configuration
    const val BASE_API_URL = "https://api.vocalx.com/v1/"
    const val API_TIMEOUT_SECONDS = 30L

    // Analytics Configuration
    const val ENABLE_ANALYTICS = false
    const val ANALYTICS_TRACKING_ID = "UA-XXXXXXXX-X"

    // Performance Configuration
    const val MAX_CONCURRENT_PROCESSING_TASKS = 2
    const val AUDIO_PROCESSING_THREAD_POOL_SIZE = 4
    const val MAX_CACHE_SIZE_MB = 500

    // Quality Settings
    const val DEFAULT_SAMPLE_RATE = 44100
    const val DEFAULT_BIT_DEPTH = 16
    const val DEFAULT_OUTPUT_FORMAT = "WAV"

    // Security Configuration
    const val ENABLE_SSL_PINNING = true
    const val ENABLE_APP_SIGNING_VERIFICATION = true

    // Debug Configuration
    const val DEBUG_LOGGING_ENABLED = true
    const val DEBUG_UI_OVERLAY_ENABLED = false

    // App Store Configuration
    const val GOOGLE_PLAY_PACKAGE_NAME = "com.vocalx"
    const val APPLE_APP_STORE_ID = "123456789"

    // Subscription Configuration
    const val SUBSCRIPTION_PRICE_YEARLY = 1.00 // $1/year
    const val FREE_TRIAL_DAYS = 30

    // Feature Availability
    val AVAILABLE_FEATURES = listOf(
        "stem_separation",
        "karaoke_extraction",
        "music_extraction",
        "audio_analysis",
        "audio_effects",
        "waveform_visualization"
    )

    // Future features (not yet implemented)
    val UPCOMING_FEATURES = listOf(
        "cloud_sync",
        "collaboration",
        "ai_mastering",
        "batch_processing",
        "plugin_support"
    )
}
