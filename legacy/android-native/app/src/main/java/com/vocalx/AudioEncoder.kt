package com.vocalx.domain

import timber.log.Timber
import java.io.File
import java.io.RandomAccessFile

/**
 * Utility for encoding audio data to WAV format
 */
object AudioEncoder {
    
    private const val BITS_PER_SAMPLE = 16
    
    fun encodeAudio(
        audioData: FloatArray,
        outputFile: File,
        sampleRate: Int = 16000,
        channels: Int = 1
    ) {
        try {
            val bitsPerSample = BITS_PER_SAMPLE
            
            val byteRate = sampleRate * channels * bitsPerSample / 8
            val blockAlign = channels * bitsPerSample / 8
            val subChunk2Size = audioData.size * channels * bitsPerSample / 8
            val chunkSize = 36 + subChunk2Size
            
            val raf = RandomAccessFile(outputFile, "rw")
            
            // WAV header
            raf.writeBytes("RIFF")
            raf.writeInt(Integer.reverseBytes(chunkSize))
            raf.writeBytes("WAVE")
            
            // fmt subchunk
            raf.writeBytes("fmt ")
            raf.writeInt(Integer.reverseBytes(16)) // Subchunk1Size
            raf.writeShort(java.lang.Short.reverseBytes(1.toShort()).toInt()) // AudioFormat (PCM)
            raf.writeShort(java.lang.Short.reverseBytes(channels.toShort()).toInt())
            raf.writeInt(Integer.reverseBytes(sampleRate))
            raf.writeInt(Integer.reverseBytes(byteRate))
            raf.writeShort(java.lang.Short.reverseBytes(blockAlign.toShort()).toInt())
            raf.writeShort(java.lang.Short.reverseBytes(bitsPerSample.toShort()).toInt())
            
            // data subchunk
            raf.writeBytes("data")
            raf.writeInt(Integer.reverseBytes(subChunk2Size))
            
            // Write audio samples
            for (sample in audioData) {
                val shortSample = (sample * 32767).toInt().toShort()
                raf.writeShort(java.lang.Short.reverseBytes(shortSample).toInt())
            }
            
            raf.close()
            
            Timber.d("Audio encoded to ${outputFile.absolutePath}, size: ${outputFile.length()} bytes")
        } catch (e: Exception) {
            Timber.e(e, "Error encoding audio")
            throw e
        }
    }
}
