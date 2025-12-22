package com.vocalx.domain

import com.vocalx.models.AudioAnalysis
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.log10
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.sin
import kotlin.math.sqrt
import kotlin.math.PI

/**
 * Analyzer for extracting audio features (BPM, key, energy, etc.)
 */
object AudioAnalyzer {

    /**
     * Analyze audio data and extract features
     */
    fun analyzeAudio(audioData: FloatArray): AudioAnalysis {
        // Basic audio analysis implementation
        val bpm = detectBPM(audioData)
        val key = detectKey(audioData)
        val energy = calculateEnergy(audioData)
        val danceability = calculateDanceability(audioData)
        val acousticness = calculateAcousticness(audioData)
        val instrumentalness = calculateInstrumentalness(audioData)
        val loudness = calculateLoudness(audioData)
        val speechiness = calculateSpeechiness(audioData)
        val valence = calculateValence(audioData)
        val tempo = bpm
        val timeSignature = detectTimeSignature(audioData)

        return AudioAnalysis(
            fileId = 0,
            bpm = bpm,
            key = key,
            energyLevel = energy,
            danceability = danceability,
            acousticness = acousticness,
            instrumentalness = instrumentalness,
            loudness = loudness,
            speechiness = speechiness,
            valence = valence,
            tempo = tempo,
            timeSignature = timeSignature
        )
    }

    private fun detectBPM(audioData: FloatArray): Float {
        // Simple BPM detection using autocorrelation
        val sampleRate = 44100
        val windowSize = min(44100, audioData.size) // 1 second window
        val window = audioData.copyOfRange(0, windowSize)

        // Apply envelope following to get amplitude envelope
        val envelope = FloatArray(window.size)
        var maxVal = 0f
        for (i in window.indices) {
            val absVal = abs(window[i])
            envelope[i] = absVal
            if (absVal > maxVal) maxVal = absVal
        }

        // Normalize envelope
        if (maxVal > 0) {
            for (i in envelope.indices) {
                envelope[i] /= maxVal
            }
        }

        // Find peaks in the envelope
        val peaks = mutableListOf<Int>()
        for (i in 1 until envelope.size - 1) {
            if (envelope[i] > envelope[i-1] && envelope[i] > envelope[i+1] && envelope[i] > 0.5f) {
                peaks.add(i)
            }
        }

        // Calculate intervals between peaks
        val intervals = mutableListOf<Int>()
        for (i in 1 until peaks.size) {
            intervals.add(peaks[i] - peaks[i-1])
        }

        if (intervals.isEmpty()) return 120f // Default BPM

        // Find most common interval
        val intervalCounts = intervals.groupingBy { it }.eachCount()
        val mostCommonInterval = intervalCounts.maxByOrNull { it.value }?.key ?: 4410 // Default to 100 BPM

        // Convert interval to BPM
        val bpm = (sampleRate * 60f) / mostCommonInterval
        return bpm.coerceIn(60f, 180f) // Reasonable BPM range
    }

    private fun detectKey(audioData: FloatArray): String {
        // Simple key detection using FFT and chroma analysis
        val chroma = calculateChroma(audioData)
        val chromaNames = listOf("C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B")

        // Find the strongest chroma
        var maxChroma = 0f
        var maxIndex = 0
        for (i in chroma.indices) {
            if (chroma[i] > maxChroma) {
                maxChroma = chroma[i]
                maxIndex = i
            }
        }

        return chromaNames[maxIndex]
    }

    private fun calculateChroma(audioData: FloatArray): FloatArray {
        // Simplified chroma feature extraction
        val chroma = FloatArray(12) { 0f }
        val sampleRate = 44100
        val fftSize = 2048
        val hopSize = 512

        // Process in windows
        var start = 0
        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Apply window function
            for (i in window.indices) {
                val t = i.toDouble() / fftSize
                window[i] *= (0.5 * (1 - cos(2 * PI * t))).toFloat() // Hann window
            }

            // Simple FFT approximation - in real implementation use proper FFT
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            // Map to chroma bins
            for (k in 1 until spectrum.size) {
                val freq = k * sampleRate.toDouble() / fftSize
                if (freq >= 27.5 && freq <= 4186.01) { // A0 to C8
                    val note = 12 * log2(freq / 440.0) + 69
                    val chromaIndex = ((note - 12) % 12).toInt()
                    if (chromaIndex in 0..11) {
                        chroma[chromaIndex] += spectrum[k]
                    }
                }
            }

            start += hopSize
        }

        // Normalize chroma
        val maxChroma = chroma.maxOrNull() ?: 1f
        if (maxChroma > 0) {
            for (i in chroma.indices) {
                chroma[i] /= maxChroma
            }
        }

        return chroma
    }

    private fun log2(x: Double): Double {
        return ln(x) / ln(2.0)
    }

    private fun ln(x: Double): Double {
        // Simple natural log approximation
        return when {
            x <= 0 -> Double.NaN
            x == 1.0 -> 0.0
            else -> {
                var result = 0.0
                var term = (x - 1) / (x + 1)
                var termSquared = term * term
                var power = term
                var sign = 1
                for (n in 1..100 step 2) {
                    result += sign * power / n
                    power *= termSquared
                    sign *= -1
                }
                result * 2
            }
        }
    }

    private fun calculateEnergy(audioData: FloatArray): Float {
        // Calculate RMS energy
        val rms = sqrt(audioData.map { it * it }.average().toFloat())
        return (rms * 100).coerceIn(0f, 100f)
    }

    private fun calculateDanceability(audioData: FloatArray): Float {
        // Danceability based on tempo and rhythmic regularity
        val bpm = detectBPM(audioData)
        val tempoFactor = (bpm - 60) / 120 // Normalize to 0-1 range for 60-180 BPM

        // Calculate spectral flux as a measure of rhythmic content
        val spectralFlux = calculateSpectralFlux(audioData)

        // Combine factors
        val danceability = (tempoFactor * 0.6f + spectralFlux * 0.4f) * 100
        return danceability.coerceIn(0f, 100f)
    }

    private fun calculateSpectralFlux(audioData: FloatArray): Float {
        // Simplified spectral flux calculation
        val sampleRate = 44100
        val fftSize = 1024
        val hopSize = 512
        var totalFlux = 0f
        var windowCount = 0

        var start = 0
        var prevSpectrum: FloatArray? = null

        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Simple FFT approximation
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            if (prevSpectrum != null) {
                // Calculate flux between current and previous spectrum
                var flux = 0f
                for (k in spectrum.indices) {
                    flux += abs(spectrum[k] - prevSpectrum[k])
                }
                totalFlux += flux
                windowCount++
            }

            prevSpectrum = spectrum
            start += hopSize
        }

        return if (windowCount > 0) totalFlux / windowCount else 0f
    }

    private fun calculateAcousticness(audioData: FloatArray): Float {
        // Acousticness detection based on spectral characteristics
        val sampleRate = 44100
        val fftSize = 2048

        // Calculate average spectrum
        val avgSpectrum = FloatArray(fftSize / 2) { 0f }
        var windowCount = 0

        var start = 0
        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Simple FFT approximation
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            for (k in avgSpectrum.indices) {
                avgSpectrum[k] += spectrum[k]
            }
            windowCount++

            start += fftSize / 2
        }

        if (windowCount > 0) {
            for (k in avgSpectrum.indices) {
                avgSpectrum[k] = avgSpectrum[k] / windowCount.toFloat()
            }
        }

        // Acoustic music tends to have more energy in lower frequencies
        val lowFreqEnergy = avgSpectrum.copyOfRange(0, avgSpectrum.size / 4).sum()
        val highFreqEnergy = avgSpectrum.copyOfRange(avgSpectrum.size / 2, avgSpectrum.size).sum()

        val acousticness = (lowFreqEnergy / (highFreqEnergy + 0.001f)) * 100
        return acousticness.coerceIn(0f, 100f)
    }

    private fun calculateInstrumentalness(audioData: FloatArray): Float {
        // Instrumentalness detection based on spectral characteristics
        val sampleRate = 44100
        val fftSize = 2048

        // Calculate average spectrum
        val avgSpectrum = FloatArray(fftSize / 2) { 0f }
        var windowCount = 0

        var start = 0
        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Simple FFT approximation
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            for (k in avgSpectrum.indices) {
                avgSpectrum[k] += spectrum[k]
            }
            windowCount++

            start += fftSize / 2
        }

        if (windowCount > 0) {
            for (k in avgSpectrum.indices) {
                avgSpectrum[k] = avgSpectrum[k] / windowCount.toFloat()
            }
        }

        // Instrumental music tends to have more consistent spectral distribution
        val spectralVariance = avgSpectrum.map { it - avgSpectrum.average().toFloat() }
            .map { it * it }
            .average()
            .toFloat()

        // Lower variance suggests more instrumental content
        val instrumentalness = (1.0f / (spectralVariance + 0.001f)) * 10
        return instrumentalness.coerceIn(0f, 100f)
    }

    private fun calculateLoudness(audioData: FloatArray): Float {
        // Calculate loudness in dB
        val rms = sqrt(audioData.map { it * it }.average().toFloat())
        return if (rms > 0) 20 * log10(rms) else -60f
    }

    private fun calculateSpeechiness(audioData: FloatArray): Float {
        // Speechiness detection based on spectral characteristics
        val sampleRate = 44100
        val fftSize = 2048

        // Calculate average spectrum
        val avgSpectrum = FloatArray(fftSize / 2) { 0f }
        var windowCount = 0

        var start = 0
        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Simple FFT approximation
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            for (k in avgSpectrum.indices) {
                avgSpectrum[k] += spectrum[k]
            }
            windowCount++

            start += fftSize / 2
        }

        if (windowCount > 0) {
            for (k in avgSpectrum.indices) {
                avgSpectrum[k] = avgSpectrum[k] / windowCount.toFloat()
            }
        }

        // Speech tends to have more energy in mid frequencies (200-4000 Hz)
        val midFreqStart = (200.0 * fftSize / sampleRate).toInt()
        val midFreqEnd = (4000.0 * fftSize / sampleRate).toInt()

        val midFreqEnergy = avgSpectrum.copyOfRange(midFreqStart, min(midFreqEnd, avgSpectrum.size)).sum()
        val totalEnergy = avgSpectrum.sum()

        val speechiness = (midFreqEnergy / (totalEnergy + 0.001f)) * 30
        return speechiness.coerceIn(0f, 30f)
    }

    private fun calculateValence(audioData: FloatArray): Float {
        // Valence detection based on spectral characteristics
        val sampleRate = 44100
        val fftSize = 2048

        // Calculate average spectrum
        val avgSpectrum = FloatArray(fftSize / 2) { 0f }
        var windowCount = 0

        var start = 0
        while (start + fftSize <= audioData.size) {
            val window = audioData.copyOfRange(start, start + fftSize)

            // Simple FFT approximation
            val spectrum = FloatArray(fftSize / 2)
            for (k in spectrum.indices) {
                var real = 0.0
                var imag = 0.0
                for (n in window.indices) {
                    val angle = 2 * PI * k * n / fftSize
                    real += window[n] * cos(angle)
                    imag += window[n] * sin(angle)
                }
                spectrum[k] = sqrt(real * real + imag * imag).toFloat()
            }

            for (k in avgSpectrum.indices) {
                avgSpectrum[k] += spectrum[k]
            }
            windowCount++

            start += fftSize / 2
        }

        if (windowCount > 0) {
            for (k in avgSpectrum.indices) {
                avgSpectrum[k] = avgSpectrum[k] / windowCount.toFloat()
            }
        }

        // Valence is related to brightness and spectral centroid
        val spectralCentroid = calculateSpectralCentroid(avgSpectrum, sampleRate, fftSize)

        // Normalize centroid to 0-1 range (typical range 500-5000 Hz)
        val normalizedCentroid = ((spectralCentroid - 500) / 4500).toFloat()
        val valence = normalizedCentroid * 100
        return valence.coerceIn(0f, 100f)
    }

    private fun calculateSpectralCentroid(spectrum: FloatArray, sampleRate: Int, fftSize: Int): Double {
        var sum = 0.0
        var weightedSum = 0.0

        for (k in spectrum.indices) {
            val freq = k * sampleRate.toDouble() / fftSize
            sum += spectrum[k]
            weightedSum += spectrum[k] * freq
        }

        return if (sum > 0) weightedSum / sum else 0.0
    }

    private fun detectTimeSignature(audioData: FloatArray): String {
        // Simple time signature detection based on peak patterns
        val sampleRate = 44100
        val windowSize = min(44100, audioData.size) // 1 second window
        val window = audioData.copyOfRange(0, windowSize)

        // Apply envelope following
        val envelope = FloatArray(window.size)
        var maxVal = 0f
        for (i in window.indices) {
            val absVal = abs(window[i])
            envelope[i] = absVal
            if (absVal > maxVal) maxVal = absVal
        }

        // Normalize envelope
        if (maxVal > 0) {
            for (i in envelope.indices) {
                envelope[i] /= maxVal
            }
        }

        // Find peaks
        val peaks = mutableListOf<Int>()
        for (i in 1 until envelope.size - 1) {
            if (envelope[i] > envelope[i-1] && envelope[i] > envelope[i+1] && envelope[i] > 0.5f) {
                peaks.add(i)
            }
        }

        // Calculate intervals between peaks
        val intervals = mutableListOf<Int>()
        for (i in 1 until peaks.size) {
            intervals.add(peaks[i] - peaks[i-1])
        }

        if (intervals.isEmpty()) return "4/4" // Default

        // Find most common interval
        val intervalCounts = intervals.groupingBy { it }.eachCount()
        val mostCommonInterval = intervalCounts.maxByOrNull { it.value }?.key ?: 4410

        // Estimate time signature based on interval patterns
        val bpm = (sampleRate * 60f) / mostCommonInterval

        // Simple heuristic: faster tempos tend to be 4/4, slower might be 3/4 or 6/8
        return when {
            bpm > 120 -> "4/4"
            bpm < 80 -> "3/4"
            else -> "4/4"
        }
    }
}
