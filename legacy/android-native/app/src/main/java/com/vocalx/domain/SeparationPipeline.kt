package com.vocalx.domain

import android.content.Context
import android.net.Uri
import com.vocalx.ai.models.QueryEncoder
import com.vocalx.ai.models.SAMAudioModelManager
import com.vocalx.utils.ContentUriUtils
import com.vocalx.utils.OutputFiles
import timber.log.Timber
import java.io.File
import kotlin.math.min

object SeparationPipeline {
    const val MODEL_SAMPLE_RATE = 16000
    const val CHUNK_SECONDS = 30
    const val CHUNK_SAMPLES = MODEL_SAMPLE_RATE * CHUNK_SECONDS

    data class Result(
        val outputFile: File,
        val latencyMs: Long,
        val decoded: DecodedAudio,
        val appliedSpanMs: LongRange? = null
    )

    /**
     * End-to-end pipeline:
     * - Decode (audio OR video container) -> PCM float (interleaved)
     * - Downmix to mono
     * - Resample to 16kHz
     * - Encode query -> embedding
     * - Chunk into 30s blocks, run inference, stitch
     * - Export WAV
     */
    suspend fun run(
        context: Context,
        inputUri: Uri,
        query: String,
        spanMs: LongRange? = null,
        modelManager: SAMAudioModelManager,
        queryEncoder: QueryEncoder,
        onProgress: (Float) -> Unit
    ): Result {
        onProgress(0f)

        val decoded = AudioDecodeService.decodeToPcmFloat(context, inputUri)
        val mono = AudioResampler.downmixToMono(decoded.samples, decoded.channelCount)
        val mono16k = AudioResampler.resampleLinear(mono, decoded.sampleRateHz, MODEL_SAMPLE_RATE)

        val appliedSpan = spanMs
            ?.let { clampSpanMs(it, decoded.durationMs) }
            ?.takeIf { it.first < it.last }

        val inputForModel = if (appliedSpan != null) {
            val startIdx = msToSampleIndex(appliedSpan.first, MODEL_SAMPLE_RATE)
            val endIdx = msToSampleIndex(appliedSpan.last, MODEL_SAMPLE_RATE)
            mono16k.copyOfRange(startIdx.coerceIn(0, mono16k.size), endIdx.coerceIn(0, mono16k.size))
        } else {
            mono16k
        }

        val embedding = queryEncoder.encodeQuery(query)

        val start = System.currentTimeMillis()
        val out = FloatArrayBuilder(initialCapacity = inputForModel.size)

        val total = inputForModel.size
        var processed = 0
        while (processed < total) {
            val remaining = total - processed
            val take = min(CHUNK_SAMPLES, remaining)

            // Pad final chunk to CHUNK_SAMPLES to match model expectations in most TFLite graphs.
            val chunk = FloatArray(CHUNK_SAMPLES)
            inputForModel.copyInto(chunk, destinationOffset = 0, startIndex = processed, endIndex = processed + take)

            val result = modelManager.processAudio(chunk, embedding)
            if (!result.success) {
                throw IllegalStateException(result.error ?: "Model inference failed")
            }

            // Trim back to the unpadded length for the last chunk.
            out.appendAll(result.separatedAudio, offset = 0, length = take)

            processed += take
            onProgress((processed.toFloat() / total.toFloat()).coerceIn(0f, 1f))
        }

        val latencyMs = System.currentTimeMillis() - start

        val baseName = ContentUriUtils.getFileName(context, inputUri).substringBeforeLast('.')
        val outputFile = OutputFiles.createOutputWavFile(context, baseName)

        // Export at model sample rate (16kHz mono).
        AudioEncoder.encodeAudio(out.toArray(), outputFile, sampleRate = MODEL_SAMPLE_RATE, channels = 1)

        Timber.i("Exported separated file: %s", outputFile.absolutePath)

        return Result(
            outputFile = outputFile,
            latencyMs = latencyMs,
            decoded = decoded,
            appliedSpanMs = appliedSpan
        )
    }

    private fun clampSpanMs(span: LongRange, durationMs: Long): LongRange {
        val d = durationMs.coerceAtLeast(0)
        val start = span.first.coerceIn(0, d)
        val end = span.last.coerceIn(0, d)
        return if (end >= start) start..end else end..start
    }

    private fun msToSampleIndex(ms: Long, sampleRate: Int): Int {
        return ((ms.coerceAtLeast(0) * sampleRate.toLong()) / 1000L).toInt()
    }
}


