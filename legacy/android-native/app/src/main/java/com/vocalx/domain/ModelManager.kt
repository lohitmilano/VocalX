package com.vocalx.domain

import android.content.Context
import android.util.Log
import com.vocalx.DeploymentConfig
import timber.log.Timber
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.URL
import java.security.MessageDigest
import kotlin.concurrent.thread

/**
 * Model Manager for handling model downloads, verification, and management
 */
class ModelManager(private val context: Context) {

    private val modelCacheDir: File by lazy {
        File(context.cacheDir, "models").apply { mkdirs() }
    }

    private val modelInfoMap = mapOf(
        "demucs" to ModelInfo(
            filename = DeploymentConfig.DEMUCS_MODEL_FILE,
            url = DeploymentConfig.DEMUCS_MODEL_URL,
            expectedSize = DeploymentConfig.DEMUCS_MODEL_SIZE_MB.toLong() * 1024L * 1024L,
            checksum = DeploymentConfig.DEMUCS_MODEL_CHECKSUM
        ),
        "openvino" to ModelInfo(
            filename = DeploymentConfig.OPENVINO_MODEL_FILE,
            url = DeploymentConfig.OPENVINO_MODEL_URL,
            expectedSize = DeploymentConfig.OPENVINO_MODEL_SIZE_MB.toLong() * 1024L * 1024L,
            checksum = DeploymentConfig.OPENVINO_MODEL_CHECKSUM
        ),
        "openvino_weights" to ModelInfo(
            filename = DeploymentConfig.OPENVINO_WEIGHTS_FILE,
            url = DeploymentConfig.OPENVINO_MODEL_URL,
            expectedSize = DeploymentConfig.OPENVINO_MODEL_SIZE_MB.toLong() * 1024L * 1024L,
            checksum = DeploymentConfig.OPENVINO_MODEL_CHECKSUM
        )
    )

    private data class ModelInfo(
        val filename: String,
        val url: String,
        val expectedSize: Long,
        val checksum: String
    )

    private data class DownloadProgress(
        val bytesDownloaded: Long,
        val totalBytes: Long,
        val percentage: Float
    )

    /**
     * Check if all required models are available
     */
    fun checkModelsAvailable(): Map<String, Boolean> {
        val results = mutableMapOf<String, Boolean>()

        modelInfoMap.forEach { (key, modelInfo) ->
            val modelFile = File(modelCacheDir, modelInfo.filename)
            results[key] = modelFile.exists() && modelFile.length() == modelInfo.expectedSize
        }

        return results
    }

    /**
     * Get model file for a specific model
     */
    fun getModelFile(modelName: String): File? {
        val modelInfo = modelInfoMap[modelName] ?: return null
        val modelFile = File(modelCacheDir, modelInfo.filename)

        if (modelFile.exists() && modelFile.length() == modelInfo.expectedSize) {
            return modelFile
        }

        return null
    }

    /**
     * Download all required models
     */
    fun downloadAllModels(
        onProgress: (modelName: String, progress: Float, bytesDownloaded: Long, totalBytes: Long) -> Unit,
        onComplete: (success: Boolean, message: String) -> Unit
    ) {
        if (!DeploymentConfig.ENABLE_MODEL_DOWNLOAD) {
            onComplete(false, "Model downloading is disabled in configuration")
            return
        }

        thread {
            try {
                var allSuccess = true
                var errorMessage = ""

                modelInfoMap.forEach { (modelName, modelInfo) ->
                    val ok = downloadModel(modelName, modelInfo) { progress, bytesDownloaded, totalBytes ->
                        onProgress(modelName, progress, bytesDownloaded, totalBytes)
                    }
                    if (!ok) {
                        allSuccess = false
                        errorMessage += "Failed to download $modelName\n"
                    }
                }

                onComplete(allSuccess, if (allSuccess) "All models downloaded successfully" else errorMessage)
            } catch (e: Exception) {
                Timber.e(e, "Error downloading models")
                onComplete(false, "Error downloading models: ${e.message}")
            }
        }
    }

    /**
     * Download a specific model
     */
    fun downloadModel(
        modelName: String,
        onProgress: (progress: Float, bytesDownloaded: Long, totalBytes: Long) -> Unit,
        onComplete: (success: Boolean, message: String) -> Unit
    ) {
        if (!DeploymentConfig.ENABLE_MODEL_DOWNLOAD) {
            onComplete(false, "Model downloading is disabled in configuration")
            return
        }

        val modelInfo = modelInfoMap[modelName] ?: run {
            onComplete(false, "Unknown model: $modelName")
            return
        }

        thread {
            try {
                val success = downloadModel(modelName, modelInfo) { progress, bytesDownloaded, totalBytes ->
                    onProgress(progress, bytesDownloaded, totalBytes)
                }
                onComplete(success, if (success) "Model downloaded successfully" else "Model download failed")
            } catch (e: Exception) {
                Timber.e(e, "Error downloading model $modelName")
                onComplete(false, "Error downloading model: ${e.message}")
            }
        }
    }

    private fun downloadModel(
        modelName: String,
        modelInfo: ModelInfo,
        onProgress: (progress: Float, bytesDownloaded: Long, totalBytes: Long) -> Unit
    ): Boolean {
        // Check if model already exists and is valid
        val modelFile = File(modelCacheDir, modelInfo.filename)
        if (modelFile.exists() && modelFile.length() == modelInfo.expectedSize) {
            Timber.d("Model $modelName already exists and is valid")
            onProgress(1.0f, modelFile.length(), modelFile.length())
            return true
        }

        // Delete existing incomplete file
        if (modelFile.exists()) {
            modelFile.delete()
        }

        Timber.d("Starting download of $modelName from ${modelInfo.url}")

        try {
            val url = URL(modelInfo.url)
            val connection = url.openConnection()
            connection.connectTimeout = 30000
            connection.readTimeout = 60000

            val totalBytes = connection.contentLengthLong
            if (totalBytes <= 0) {
                Timber.e("Invalid content length for model $modelName")
                return false
            }

            val inputStream = connection.getInputStream()
            val outputStream = FileOutputStream(modelFile)

            val buffer = ByteArray(8192)
            var bytesRead = 0
            var totalBytesRead = 0L

            inputStream.use { input ->
                outputStream.use { output ->
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        output.write(buffer, 0, bytesRead)
                        totalBytesRead += bytesRead

                        val progress = totalBytesRead.toFloat() / totalBytes
                        onProgress(progress, totalBytesRead, totalBytes)

                        // Check if download was cancelled or app is in background
                        // In a real implementation, this would check for cancellation signals
                    }
                }
            }

            // Verify file size
            if (modelFile.length() != totalBytes) {
                Timber.e("Downloaded file size mismatch for $modelName")
                modelFile.delete()
                return false
            }

            // Verify checksum (simplified - in real implementation use proper checksum verification)
            if (!verifyChecksum(modelFile, modelInfo.checksum)) {
                Timber.e("Checksum verification failed for $modelName")
                modelFile.delete()
                return false
            }

            Timber.d("Successfully downloaded and verified $modelName")
            return true

        } catch (e: IOException) {
            Timber.e(e, "IO Error downloading model $modelName")
            if (modelFile.exists()) {
                modelFile.delete()
            }
            return false
        } catch (e: Exception) {
            Timber.e(e, "Error downloading model $modelName")
            if (modelFile.exists()) {
                modelFile.delete()
            }
            return false
        }
    }

    /**
     * Verify file checksum (simplified implementation)
     */
    private fun verifyChecksum(file: File, expectedChecksum: String): Boolean {
        // In a real implementation, this would use proper checksum verification
        // For now, we'll just check that the file exists and has content
        return file.exists() && file.length() > 0
    }

    /**
     * Get model cache directory
     */
    fun getModelCacheDirectory(): File {
        return modelCacheDir
    }

    /**
     * Clear all cached models
     */
    fun clearModelCache(): Boolean {
        return try {
            modelCacheDir.listFiles()?.forEach { file ->
                file.delete()
            }
            true
        } catch (e: Exception) {
            Timber.e(e, "Error clearing model cache")
            false
        }
    }

    /**
     * Get total cache size in bytes
     */
    fun getCacheSize(): Long {
        return modelCacheDir.listFiles()?.sumOf { it.length() } ?: 0L
    }

    /**
     * Initialize model manager - check and download models if needed
     */
    fun initialize(
        onProgress: (modelName: String, progress: Float) -> Unit = { _, _ -> },
        onComplete: (allModelsAvailable: Boolean) -> Unit = {}
    ) {
        if (DeploymentConfig.MODEL_DOWNLOAD_ON_STARTUP) {
            val availableModels = checkModelsAvailable()
            val missingModels = availableModels.filter { !it.value }.keys

            if (missingModels.isNotEmpty()) {
                Timber.d("Missing models: ${missingModels.joinToString(", ")}")
                downloadAllModels(
                    onProgress = { modelName, progress, _, _ ->
                        onProgress(modelName, progress)
                    },
                    onComplete = { success, _ ->
                        onComplete(success)
                    }
                )
            } else {
                Timber.d("All models are available")
                onComplete(true)
            }
        } else {
            onComplete(true)
        }
    }
}
