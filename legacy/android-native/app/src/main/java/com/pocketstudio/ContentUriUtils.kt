package com.vocalx.utils

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import timber.log.Timber

/**
 * Utility object for handling content URIs.
 */
object ContentUriUtils {

    /**
     * Gets the display name of a file from its content URI.
     *
     * This method queries the ContentResolver to get the display name of the file
     * associated with the given URI. It's the recommended way to get a file name
     * from a URI obtained from the Storage Access Framework.
     *
     * @param context The application context to access the ContentResolver.
     * @param uri The content URI of the file.
     * @return The display name of the file, or the last path segment if the name cannot be resolved.
     */
    fun getFileName(context: Context, uri: Uri): String {
        var fileName: String? = null
        val scheme = uri.scheme

        if (scheme == "content") {
            try {
                context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    if (cursor.moveToFirst()) {
                        val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                        if (nameIndex != -1) {
                            fileName = cursor.getString(nameIndex)
                        }
                    }
                }
            } catch (e: Exception) {
                Timber.e(e, "Failed to get file name from content URI")
            }
        }

        if (fileName == null) {
            fileName = uri.path?.substringAfterLast("/")
        }

        return fileName ?: "unknown_file"
    }
}
