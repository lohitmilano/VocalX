package com.vocalx.ai.models

import android.content.Context
import org.tensorflow.lite.Delegate
import org.tensorflow.lite.Interpreter
import org.tensorflow.lite.gpu.GpuDelegate
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel

class SAMAudioModelManager(private val context: Context) {

    private var modelBuffer: ByteBuffer? = null
    private var interpreter: Interpreter? = null
    private var gpuDelegate: GpuDelegate? = null
    private var nnApiDelegate: Delegate? = null

    private val MODEL_PATH = "models/sam_audio_small_fp16.tflite"

    fun initializeModel() {
        try {
            // Load model from assets (or cache)
            modelBuffer = loadModelBuffer()

            // Create TFLite interpreter
            val options = Interpreter.Options()
            options.setNumThreads(4)

            // Add GPU delegate if available
            try {
                gpuDelegate = GpuDelegate()
                options.addDelegate(gpuDelegate!!)
            } catch (e: Throwable) {
                println("[VocalX] GPU delegate not available: ${e.message}")
            }

            // Add NNAPI delegate for NPU acceleration (best-effort)
            try {
                val cls = Class.forName("org.tensorflow.lite.nnapi.NnApiDelegate")
                val delegate = cls.getDeclaredConstructor().newInstance() as Delegate
                nnApiDelegate = delegate
                options.addDelegate(delegate)
            } catch (e: Throwable) {
                println("[VocalX] NNAPI not available: ${e.message}")
            }

            interpreter = Interpreter(modelBuffer!!, options)
            println("[VocalX] Model initialized successfully")

        } catch (e: Exception) {
            throw RuntimeException("Failed to initialize SAM-Audio model: ${e.message}", e)
        }
    }

    fun processAudio(
        audioData: FloatArray,
        queryEmbedding: FloatArray,
        onProgress: ((Float) -> Unit)? = null
    ): AudioSeparationResult {

        val startTime = System.currentTimeMillis()

        try {
            // Prepare inputs
            val inputAudio = ByteBuffer.allocateDirect(audioData.size * 4).order(ByteOrder.nativeOrder())
            inputAudio.asFloatBuffer().put(audioData)

            val inputQuery = ByteBuffer.allocateDirect(queryEmbedding.size * 4).order(ByteOrder.nativeOrder())
            inputQuery.asFloatBuffer().put(queryEmbedding)

            // Create output buffer
            val outputArray = FloatArray(audioData.size)
            val outputBuffer = ByteBuffer.allocateDirect(outputArray.size * 4).order(ByteOrder.nativeOrder())

            // Run inference
            interpreter?.runForMultipleInputsOutputs(arrayOf(inputAudio, inputQuery), mapOf(0 to outputBuffer))

            // Extract output
            outputBuffer.rewind()
            outputBuffer.asFloatBuffer().get(outputArray)

            val endTime = System.currentTimeMillis()
            val latencyMs = endTime - startTime

            // Normalize output
            val normalized = normalizeAudio(outputArray)

            return AudioSeparationResult(
                separatedAudio = normalized,
                latencyMs = latencyMs,
                deviceType = "on-device",
                success = true
            )

        } catch (e: Exception) {
            val endTime = System.currentTimeMillis()
            return AudioSeparationResult(
                separatedAudio = FloatArray(audioData.size),
                latencyMs = endTime - startTime,
                deviceType = "on-device",
                success = false,
                error = e.message
            )
        }
    }

    private fun normalizeAudio(audio: FloatArray): FloatArray {
        // Find peak
        val peak = audio.map { kotlin.math.abs(it) }.maxOrNull() ?: 1f

        // Normalize to [-1, 1] range
        return if (peak > 0f) {
            audio.map { it / peak }.toFloatArray()
        } else {
            audio
        }
    }

    private fun loadModelBuffer(): ByteBuffer {
        // Cache location (mapped from disk to avoid 1.8GB heap allocations)
        val cacheFile = File(context.cacheDir, "sam_audio_model.tflite")

        if (cacheFile.exists() && cacheFile.length() > 0) {
            println("[VocalX] Loading model from cache...")
            return mapReadOnly(cacheFile)
        }

        // Prefer direct mmap from assets when the asset is stored uncompressed.
        try {
            val afd = context.assets.openFd(MODEL_PATH)
            FileInputStream(afd.fileDescriptor).channel.use { ch ->
                val mapped = ch.map(FileChannel.MapMode.READ_ONLY, afd.startOffset, afd.declaredLength)
                println("[VocalX] Model memory-mapped from assets")
                return mapped
            }
        } catch (_: Exception) {
            // Fallback: stream-copy to cache then mmap.
        }

        println("[VocalX] Copying model from assets to cache (first run)...")
        context.assets.open(MODEL_PATH).use { input ->
            cacheFile.outputStream().use { output ->
                input.copyTo(output)
            }
        }
        return mapReadOnly(cacheFile)
    }

    private fun mapReadOnly(file: File): MappedByteBuffer {
        FileInputStream(file).channel.use { ch ->
            return ch.map(FileChannel.MapMode.READ_ONLY, 0, ch.size())
        }
    }

    fun release() {
        interpreter?.close()
        gpuDelegate?.close()
        (nnApiDelegate as? AutoCloseable)?.close()
    }
}
