package com.vocalx.domain

import kotlin.math.abs

/**
 * Utility for normalizing audio levels
 */
object AudioNormalizer {

    /**
     * Normalize audio to prevent clipping
     */
    fun normalize(audioData: FloatArray): FloatArray {
        if (audioData.isEmpty()) return audioData

        // Find peak amplitude
        var peak = 0f
        for (sample in audioData) {
            peak = maxOf(peak, abs(sample))
        }

        if (peak == 0f || peak >= 1f) {
            return audioData // Already normalized or silent
        }

        // Scale to use full dynamic range
        val scaleFactor = 0.95f / peak
        val normalized = FloatArray(audioData.size)

        for (i in audioData.indices) {
            normalized[i] = audioData[i] * scaleFactor
        }

        return normalized
    }

    /**
     * Apply loudness normalization (LUFS)
     */
    fun normalizeLoudness(audioData: FloatArray, targetLufs: Float = -14f): FloatArray {
        // Simplified LUFS normalization
        // Full implementation would use ITU-R BS.1770 standard

        val rms = calculateRMS(audioData)
        if (rms == 0f) return audioData

        val currentLufs = 20 * Math.log10(rms.toDouble()).toFloat()
        val gainDb = targetLufs - currentLufs
        val gainLinear = Math.pow(10.0, (gainDb / 20).toDouble()).toFloat()

        return FloatArray(audioData.size) { i ->
            (audioData[i] * gainLinear).coerceIn(-1f, 1f)
        }
    }

    private fun calculateRMS(audioData: FloatArray): Float {
        if (audioData.isEmpty()) return 0f

        var sumSquares = 0.0
        for (sample in audioData) {
            sumSquares += sample * sample
        }

        return Math.sqrt(sumSquares / audioData.size).toFloat()
    }
}
