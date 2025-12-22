package com.vocalx.utils

import android.content.Context
import java.io.File

object OutputFiles {
    fun createOutputWavFile(context: Context, baseName: String): File {
        val safe = baseName
            .replace(Regex("[^A-Za-z0-9._-]"), "_")
            .take(60)
            .ifBlank { "output" }

        val dir = File(context.cacheDir, "exports").apply { mkdirs() }
        return File(dir, "${safe}_separated.wav")
    }
}


