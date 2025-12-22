package com.vocalx.domain

/**
 * Decoded PCM audio in normalized float samples [-1, 1].
 *
 * Samples are interleaved if channelCount > 1.
 */
data class DecodedAudio(
    val samples: FloatArray,
    val sampleRateHz: Int,
    val channelCount: Int,
    val durationMs: Long,
    val mimeType: String? = null
)


