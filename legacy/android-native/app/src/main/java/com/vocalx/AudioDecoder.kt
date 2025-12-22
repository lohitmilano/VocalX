package com.vocalx.domain

import android.media.MediaExtractor
import android.media.MediaFormat
import timber.log.Timber
import java.io.File
import java.nio.ByteBuffer

/**
 * Utility for decoding audio files to raw PCM data
 */
object AudioDecoder {
    
    fun decodeAudio(file: File): FloatArray {
        return try {
            val extractor = MediaExtractor()
            extractor.setDataSource(file.absolutePath)
            
            var format: MediaFormat? = null
            var trackIndex = -1
            
            // Find audio track
            for (i in 0 until extractor.trackCount) {
                val fmt = extractor.getTrackFormat(i)
                val mime = fmt.getString(MediaFormat.KEY_MIME) ?: ""
                if (mime.startsWith("audio/")) {
                    format = fmt
                    trackIndex = i
                    break
                }
            }
            
            if (format == null || trackIndex == -1) {
                throw IllegalStateException("No audio track found")
            }
            
            val sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channelCount = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
            val duration = format.getLong(MediaFormat.KEY_DURATION)
            
            // Calculate expected sample count
            val expectedSamples = (sampleRate * duration / 1_000_000).toInt()
            val audioData = FloatArray(expectedSamples)
            
            extractor.selectTrack(trackIndex)
            
            var sampleIndex = 0
            val bufferSize = 4096
            val buffer = ByteBuffer.allocate(bufferSize)
            
            while (true) {
                val bytesRead = extractor.readSampleData(buffer, 0)
                if (bytesRead <= 0) break
                
                buffer.rewind()
                
                // Convert bytes to float samples (assuming 16-bit PCM)
                for (i in 0 until bytesRead / 2) {
                    val sample = buffer.short.toFloat() / 32768f
                    if (sampleIndex < audioData.size) {
                        audioData[sampleIndex++] = sample
                    }
                }
                
                extractor.advance()
            }
            
            extractor.release()
            
            Timber.d("Decoded audio: ${audioData.size} samples, $sampleRate Hz, $channelCount channels")
            
            audioData.take(sampleIndex).toFloatArray()
        } catch (e: Exception) {
            Timber.e(e, "Error decoding audio")
            throw e
        }
    }
}
