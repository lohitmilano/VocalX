package com.vocalx.models

/**
 * Configuration for audio processing operations
 */
data class ProcessingConfig(
    val normalizeOutput: Boolean = true,
    val quality: ProcessingQuality = ProcessingQuality.MEDIUM,
    val enableGPU: Boolean = true
)

enum class ProcessingQuality {
    FAST,      // Lower quality, faster processing
    MEDIUM,    // Balanced quality and speed
    HIGH       // Highest quality, slower processing
}
