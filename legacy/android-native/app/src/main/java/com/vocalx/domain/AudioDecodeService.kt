package com.vocalx.domain

import android.content.Context
import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.net.Uri
import android.os.Build
import timber.log.Timber
import java.nio.ByteBuffer
import kotlin.math.max

/**
 * Decodes an input Uri (audio or video container) into PCM float samples.
 *
 * This uses MediaExtractor + MediaCodec and will extract the first audio track it finds.
 */
object AudioDecodeService {

    fun decodeToPcmFloat(context: Context, uri: Uri): DecodedAudio {
        val extractor = MediaExtractor()
        try {
            extractor.setDataSource(context, uri, null)

            val (trackIndex, inputFormat) = findFirstAudioTrack(extractor)
                ?: throw IllegalArgumentException("No audio track found in selected file")

            extractor.selectTrack(trackIndex)

            val mime = inputFormat.getString(MediaFormat.KEY_MIME)
                ?: throw IllegalArgumentException("Missing MIME type for audio track")

            val sampleRate = inputFormat.getInteger(MediaFormat.KEY_SAMPLE_RATE)
            val channels = inputFormat.getInteger(MediaFormat.KEY_CHANNEL_COUNT)

            val durationUs = if (inputFormat.containsKey(MediaFormat.KEY_DURATION)) {
                inputFormat.getLong(MediaFormat.KEY_DURATION)
            } else {
                -1L
            }

            val decoder = MediaCodec.createDecoderByType(mime)
            decoder.configure(inputFormat, null, null, 0)
            decoder.start()

            val out = FloatArrayBuilder(initialCapacity = estimateInitialCapacity(sampleRate, channels, durationUs))
            val info = MediaCodec.BufferInfo()

            var sawInputEos = false
            var sawOutputEos = false

            while (!sawOutputEos) {
                // Feed input
                if (!sawInputEos) {
                    val inIndex = decoder.dequeueInputBuffer(10_000)
                    if (inIndex >= 0) {
                        val inBuf = decoder.getInputBuffer(inIndex)!!
                        val sampleSize = extractor.readSampleData(inBuf, 0)
                        if (sampleSize < 0) {
                            decoder.queueInputBuffer(
                                inIndex,
                                0,
                                0,
                                0L,
                                MediaCodec.BUFFER_FLAG_END_OF_STREAM
                            )
                            sawInputEos = true
                        } else {
                            val presentationTimeUs = extractor.sampleTime
                            decoder.queueInputBuffer(inIndex, 0, sampleSize, presentationTimeUs, 0)
                            extractor.advance()
                        }
                    }
                }

                // Drain output
                val outIndex = decoder.dequeueOutputBuffer(info, 10_000)
                when {
                    outIndex >= 0 -> {
                        if (info.size > 0) {
                            val outBuf = decoder.getOutputBuffer(outIndex)!!
                            outBuf.position(info.offset)
                            outBuf.limit(info.offset + info.size)
                            appendPcmFromDecoderOutput(out, outBuf, decoder.outputFormat)
                        }

                        decoder.releaseOutputBuffer(outIndex, false)

                        if ((info.flags and MediaCodec.BUFFER_FLAG_END_OF_STREAM) != 0) {
                            sawOutputEos = true
                        }
                    }
                    outIndex == MediaCodec.INFO_OUTPUT_FORMAT_CHANGED -> {
                        Timber.i("Decoder output format changed: %s", decoder.outputFormat)
                    }
                    outIndex == MediaCodec.INFO_TRY_AGAIN_LATER -> {
                        // no-op
                    }
                }
            }

            decoder.stop()
            decoder.release()

            val samples = out.toArray()
            val durationMs = if (durationUs > 0) durationUs / 1000 else estimateDurationMs(samples.size, sampleRate, channels)

            Timber.i(
                "Decoded audio: samples=%d, sr=%d, ch=%d, durMs=%d, mime=%s",
                samples.size,
                sampleRate,
                channels,
                durationMs,
                mime
            )

            return DecodedAudio(
                samples = samples,
                sampleRateHz = sampleRate,
                channelCount = channels,
                durationMs = durationMs,
                mimeType = mime
            )
        } finally {
            try {
                extractor.release()
            } catch (_: Throwable) {
            }
        }
    }

    private fun findFirstAudioTrack(extractor: MediaExtractor): Pair<Int, MediaFormat>? {
        for (i in 0 until extractor.trackCount) {
            val fmt = extractor.getTrackFormat(i)
            val mime = fmt.getString(MediaFormat.KEY_MIME) ?: continue
            if (mime.startsWith("audio/")) return i to fmt
        }
        return null
    }

    private fun estimateInitialCapacity(sampleRate: Int, channels: Int, durationUs: Long): Int {
        if (durationUs <= 0) return 1024 * channels
        val seconds = (durationUs / 1_000_000.0).coerceAtMost(600.0) // cap estimate at 10 minutes
        val frames = (sampleRate * seconds).toInt()
        // interleaved samples
        return max(1024, frames * channels)
    }

    private fun estimateDurationMs(sampleCount: Int, sampleRate: Int, channels: Int): Long {
        val frames = if (channels > 0) sampleCount / channels else sampleCount
        return ((frames * 1000.0) / sampleRate.toDouble()).toLong()
    }

    private fun appendPcmFromDecoderOutput(out: FloatArrayBuilder, buf: ByteBuffer, outputFormat: MediaFormat) {
        // Prefer float output if the codec provides it (rare, but possible).
        val encoding = if (outputFormat.containsKey(MediaFormat.KEY_PCM_ENCODING)) {
            outputFormat.getInteger(MediaFormat.KEY_PCM_ENCODING)
        } else {
            // Default to 16-bit PCM (most common).
            android.media.AudioFormat.ENCODING_PCM_16BIT
        }

        when (encoding) {
            android.media.AudioFormat.ENCODING_PCM_FLOAT -> {
                val floatBuf = buf.asFloatBuffer()
                val tmp = FloatArray(floatBuf.remaining())
                floatBuf.get(tmp)
                out.appendAll(tmp)
            }
            android.media.AudioFormat.ENCODING_PCM_16BIT -> {
                // MediaCodec outputs little-endian PCM.
                val shortBuf = buf.asShortBuffer()
                val n = shortBuf.remaining()
                for (i in 0 until n) {
                    out.append(shortBuf.get().toFloat() / 32768f)
                }
            }
            else -> {
                // Fallback: treat as 16-bit.
                val shortBuf = buf.asShortBuffer()
                val n = shortBuf.remaining()
                for (i in 0 until n) {
                    out.append(shortBuf.get().toFloat() / 32768f)
                }
            }
        }
    }
}


