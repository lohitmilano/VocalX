package com.vocalx.utils

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.vocalx.BuildConfig
import java.io.File

object ShareUtils {
    fun shareAudioFile(context: Context, file: File, mimeType: String = "audio/wav") {
        val uri = FileProvider.getUriForFile(
            context,
            "${BuildConfig.APPLICATION_ID}.fileprovider",
            file
        )

        val intent = Intent(Intent.ACTION_SEND).apply {
            type = mimeType
            putExtra(Intent.EXTRA_STREAM, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }

        context.startActivity(Intent.createChooser(intent, "Share separated audio"))
    }
}


