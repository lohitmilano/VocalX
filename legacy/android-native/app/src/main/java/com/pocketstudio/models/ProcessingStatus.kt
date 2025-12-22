package com.vocalx.models

/**
 * Status of ongoing audio processing
 */
data class ProcessingStatus(
    val fileId: Long,
    val progress: Int, // 0-100
    val currentStep: String,
    val estimatedTimeRemainingMs: Long,
    val isProcessing: Boolean
)
