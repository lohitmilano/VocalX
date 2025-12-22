package com.vocalx.utils

import android.media.MediaExtractor
import android.media.MediaFormat
import timber.log.Timber
import java.io.File

/**
 * Utility for extracting audio metadata from files
 */
object AudioMetadataExtractor {
    
    data class AudioMetadata(
        val duration: Long, // milliseconds
        val sampleRate: Int, // Hz
        val channels: Int,
        val bitrate: Int // kbps
    )
    
    fun extractMetadata(file: File): AudioMetadata {
        return try {
            val extractor = MediaExtractor()
            extractor.setDataSource(file.absolutePath)
            
            var duration = 0L
            var sampleRate = 44100
            var channels = 2
            var bitrate = 128
            
            for (i in 0 until extractor.trackCount) {
                val format = extractor.getTrackFormat(i)
                val mime = format.getString(MediaFormat.KEY_MIME) ?: ""
                
                if (mime.startsWith("audio/")) {
                    duration = format.getLong(MediaFormat.KEY_DURATION) / 1000 // Convert to ms
                    sampleRate = format.getInteger(MediaFormat.KEY_SAMPLE_RATE)
                    channels = format.getInteger(MediaFormat.KEY_CHANNEL_COUNT)
                    bitrate = format.getInteger(MediaFormat.KEY_BIT_RATE) / 1000
                    break
                }
            }
            
            extractor.release()
            
            AudioMetadata(
                duration = duration,
                sampleRate = sampleRate,
                channels = channels,
                bitrate = bitrate
            )
        } catch (e: Exception) {
            Timber.e(e, "Error extracting metadata")
            // Return default values if extraction fails
            AudioMetadata(
                duration = 0L,
                sampleRate = 44100,
                channels = 2,
                bitrate = 128
            )
        }
    }
}
