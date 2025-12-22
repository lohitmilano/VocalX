package com.vocalx.ai.models

data class AudioSeparationResult(
    val separatedAudio: FloatArray,
    val latencyMs: Long,
    val deviceType: String,
    val success: Boolean,
    val error: String? = null
)
