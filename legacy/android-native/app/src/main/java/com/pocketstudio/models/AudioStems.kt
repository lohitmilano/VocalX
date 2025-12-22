package com.vocalx.models

import java.io.File

/**
 * Represents separated audio stems from a source file
 */
data class AudioStems(
    val id: Long,
    val originalFileId: Long,
    val vocals: File,
    val drums: File,
    val bass: File,
    val other: File
)
