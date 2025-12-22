package com.vocalx.ai.models

import android.content.Context
import org.tensorflow.lite.Interpreter
import java.io.File
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.MappedByteBuffer
import java.nio.channels.FileChannel
import java.util.Locale

class QueryEncoder(private val context: Context) {

    private var interpreter: Interpreter? = null
    private val EMBEDDING_SIZE = 512
    private val MODEL_PATH = "models/query_encoder_fp16.tflite"

    private val vocab = mapOf(
        "extract" to 1024,
        "vocals" to 2051,
        "drums" to 512,
        "bass" to 1089,
        "guitar" to 2048,
        "piano" to 1536,
        "strings" to 768,
        "percussion" to 1792,
        "remove" to 2560,
        "isolate" to 3072,
        "separate" to 3584
    )

    fun initialize() {
        try {
            val modelBuffer = loadModelFromAssets()
            val options = Interpreter.Options().setNumThreads(2)
            interpreter = Interpreter(modelBuffer, options)
            println("[VocalX] Query encoder initialized")
        } catch (e: Exception) {
            throw RuntimeException("Failed to init query encoder: ${e.message}", e)
        }
    }

    fun encodeQuery(text: String): FloatArray {
        try {
            val tokens = tokenize(text)

            // Create input buffer
            val input = ByteBuffer.allocateDirect(tokens.size * 4).order(ByteOrder.nativeOrder())
            input.asIntBuffer().put(tokens.toIntArray())

            // Create output buffer (512-dim embedding)
            val output = ByteBuffer.allocateDirect(EMBEDDING_SIZE * 4).order(ByteOrder.nativeOrder())

            // Run inference
            interpreter?.run(input, output)

            // Extract embedding
            val embedding = FloatArray(EMBEDDING_SIZE)
            output.rewind()
            output.asFloatBuffer().get(embedding)

            // Normalize embedding
            return normalizeEmbedding(embedding)

        } catch (e: Exception) {
            println("[VocalX] Query encoding error: ${e.message}")
            return FloatArray(EMBEDDING_SIZE) { 0f }
        }
    }

    private fun tokenize(text: String): List<Int> {
        return text.lowercase(Locale.ROOT).split("\\s+".toRegex()).map { word ->
            vocab[word] ?: 0  // Unknown words -> padding token
        }
    }

    private fun normalizeEmbedding(embedding: FloatArray): FloatArray {
        // L2 normalization for embeddings
        val norm = Math.sqrt(embedding.map { it * it }.sum().toDouble()).toFloat()
        return if (norm > 0f) {
            embedding.map { it / norm }.toFloatArray()
        } else {
            embedding
        }
    }

    private fun loadModelFromAssets(): ByteBuffer {
        // Cache (mmap) to avoid copying large buffers onto heap.
        val cacheFile = File(context.cacheDir, "query_encoder.tflite")
        if (cacheFile.exists() && cacheFile.length() > 0) {
            return mapReadOnly(cacheFile)
        }

        // Prefer direct mmap from assets when possible.
        try {
            val afd = context.assets.openFd(MODEL_PATH)
            FileInputStream(afd.fileDescriptor).channel.use { ch ->
                return ch.map(FileChannel.MapMode.READ_ONLY, afd.startOffset, afd.declaredLength)
            }
        } catch (_: Exception) {
            // Fallback to stream-copy then mmap.
        }

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
    }
}
