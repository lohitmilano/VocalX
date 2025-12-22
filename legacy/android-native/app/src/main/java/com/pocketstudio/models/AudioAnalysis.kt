package com.vocalx.models

/**
 * Represents audio analysis results
 */
data class AudioAnalysis(
    val fileId: Long,
    val bpm: Float,
    val key: String,
    val energyLevel: Float,
    val danceability: Float,
    val acousticness: Float,
    val instrumentalness: Float,
    val loudness: Float,
    val speechiness: Float,
    val valence: Float,
    val tempo: Float,
    val timeSignature: String
)
