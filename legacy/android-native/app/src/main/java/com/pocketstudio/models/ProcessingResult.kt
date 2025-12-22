package com.vocalx.models

/**
 * Result of audio processing operation
 */
data class ProcessingResult(
    val success: Boolean,
    val fileId: Long,
    val stems: AudioStems? = null,
    val analysis: AudioAnalysis? = null,
    val processingTimeMs: Long = 0,
    val errorMessage: String? = null
)
