package com.vocalx.models

import java.util.Date

/**
 * Performance log for tracking processing performance
 */
data class PerformanceLog(
    val timestamp: Date = Date(),
    val operationType: String,
    val fileId: Long,
    val processingTimeMs: Long,
    val memoryUsageMb: Double,
    val cpuUsagePercent: Double,
    val success: Boolean,
    val errorMessage: String? = null,
    val additionalMetrics: Map<String, Any> = emptyMap()
) {
    companion object {
        fun createForStemSeparation(
            fileId: Long,
            processingTimeMs: Long,
            success: Boolean,
            errorMessage: String? = null
        ): PerformanceLog {
            return PerformanceLog(
                operationType = "stem_separation",
                fileId = fileId,
                processingTimeMs = processingTimeMs,
                memoryUsageMb = 0.0, // Would be measured in real implementation
                cpuUsagePercent = 0.0, // Would be measured in real implementation
                success = success,
                errorMessage = errorMessage
            )
        }

        fun createForKaraokeExtraction(
            fileId: Long,
            processingTimeMs: Long,
            success: Boolean,
            errorMessage: String? = null
        ): PerformanceLog {
            return PerformanceLog(
                operationType = "karaoke_extraction",
                fileId = fileId,
                processingTimeMs = processingTimeMs,
                memoryUsageMb = 0.0,
                cpuUsagePercent = 0.0,
                success = success,
                errorMessage = errorMessage
            )
        }

        fun createForMusicExtraction(
            fileId: Long,
            processingTimeMs: Long,
            success: Boolean,
            errorMessage: String? = null
        ): PerformanceLog {
            return PerformanceLog(
                operationType = "music_extraction",
                fileId = fileId,
                processingTimeMs = processingTimeMs,
                memoryUsageMb = 0.0,
                cpuUsagePercent = 0.0,
                success = success,
                errorMessage = errorMessage
            )
        }

        fun createForOpenVINOProcessing(
            fileId: Long,
            processingTimeMs: Long,
            success: Boolean,
            errorMessage: String? = null
        ): PerformanceLog {
            return PerformanceLog(
                operationType = "openvino_processing",
                fileId = fileId,
                processingTimeMs = processingTimeMs,
                memoryUsageMb = 0.0,
                cpuUsagePercent = 0.0,
                success = success,
                errorMessage = errorMessage
            )
        }

        fun createForAudioEffects(
            fileId: Long,
            processingTimeMs: Long,
            success: Boolean,
            errorMessage: String? = null
        ): PerformanceLog {
            return PerformanceLog(
                operationType = "audio_effects",
                fileId = fileId,
                processingTimeMs = processingTimeMs,
                memoryUsageMb = 0.0,
                cpuUsagePercent = 0.0,
                success = success,
                errorMessage = errorMessage
            )
        }
    }
}
