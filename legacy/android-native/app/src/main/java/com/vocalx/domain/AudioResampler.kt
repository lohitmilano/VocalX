package com.vocalx.domain

import kotlin.math.max

object AudioResampler {

    fun downmixToMono(interleaved: FloatArray, channelCount: Int): FloatArray {
        if (channelCount <= 1) return interleaved
        val frames = interleaved.size / channelCount
        val mono = FloatArray(frames)
        var src = 0
        for (i in 0 until frames) {
            var sum = 0f
            for (c in 0 until channelCount) {
                sum += interleaved[src++]
            }
            mono[i] = sum / channelCount.toFloat()
        }
        return mono
    }

    /**
     * Simple linear resampler. Good enough for v2 baseline; can be replaced with a higher quality
     * polyphase resampler later if needed.
     */
    fun resampleLinear(inputMono: FloatArray, inRate: Int, outRate: Int): FloatArray {
        if (inRate == outRate) return inputMono
        require(inRate > 0 && outRate > 0) { "Invalid sample rates: $inRate -> $outRate" }
        if (inputMono.isEmpty()) return inputMono

        val ratio = outRate.toDouble() / inRate.toDouble()
        val outLength = max(1, (inputMono.size * ratio).toInt())
        val out = FloatArray(outLength)

        for (i in 0 until outLength) {
            val srcPos = i / ratio
            val srcIndex = srcPos.toInt()
            val frac = (srcPos - srcIndex)

            val a = inputMono[srcIndex.coerceIn(0, inputMono.lastIndex)]
            val b = inputMono[(srcIndex + 1).coerceIn(0, inputMono.lastIndex)]
            out[i] = (a + (b - a) * frac.toFloat())
        }
        return out
    }
}


