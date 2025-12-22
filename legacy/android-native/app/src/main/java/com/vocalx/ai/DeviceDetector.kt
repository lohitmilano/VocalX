package com.vocalx.ai

import android.content.Context
import android.os.Build
import android.util.Log
import java.util.Locale

class DeviceDetector(private val context: Context) {

    fun detectTier(): DevicePerformanceTier {
        val socModel = getSocModel() ?: Build.DEVICE
        val ramGb = getTotalRamInGB()
        val hasNpu = hasNeuralProcessingUnit()

        return when {
            // TIER 1: Latest AI flagships
            isPremiumAI(socModel) && hasNpu && ramGb >= 8 -> DevicePerformanceTier.PREMIUM_AI

            // TIER 2: Previous gen AI phones
            isMidPremiumAI(socModel) && hasNpu && ramGb >= 6 -> DevicePerformanceTier.MID_PREMIUM_AI

            // NOT SUPPORTED
            else -> {
                logDeviceInfo("Non-AI device detected: $socModel, RAM: ${ramGb}GB, NPU: $hasNpu")
                DevicePerformanceTier.NON_AI
            }
        }
    }

    private fun isPremiumAI(socModel: String): Boolean {
        return socModel.contains("SM8650") ||      // Snapdragon 8 Gen 3 Leading
               socModel.contains("SM8550") ||      // Snapdragon 8 Gen 2 Leading (v2)
               Build.MODEL.contains("Pixel 9") ||
               Build.MODEL.contains("Galaxy S24") ||
               isA17OrNewer()
    }

    private fun isMidPremiumAI(socModel: String): Boolean {
        return socModel.contains("SM8550") ||      // Snapdragon 8 Gen 2 Leading
               socModel.contains("SM8475") ||      // Snapdragon 8 Gen 2
               Build.MODEL.contains("Pixel 8") ||
               Build.MODEL.contains("Galaxy S23") ||
               isA16OrNewer()
    }

    private fun hasNeuralProcessingUnit(): Boolean {
        val hasNeuralNetworksFeature =
            Build.VERSION.SDK_INT >= 27 && context.packageManager.hasSystemFeature("android.hardware.neuralnetworks")

        val soc = (getSocModel() ?: "").lowercase(Locale.ROOT)
        val heuristicBySoc =
            soc.contains("sm8650") || // SD 8 Gen 3 family
            soc.contains("sm8550") || // SD 8 Gen 2 family
            soc.contains("exynos") ||
            soc.contains("tensor") ||
            soc.contains("dimensity") ||
            soc.contains("apple")

        // Some devices don’t expose a helpful SOC string; use a conservative OR.
        return hasNeuralNetworksFeature || heuristicBySoc || Build.BRAND.equals("Apple", ignoreCase = true)
    }

    private fun isA17OrNewer(): Boolean {
        val model = Build.MODEL
        return model.contains("iPhone 15")         // A17 or later
    }

    private fun isA16OrNewer(): Boolean {
        val model = Build.MODEL
        return model.contains("iPhone 14") ||      // A16 or later
               model.contains("iPhone 15")
    }

    private fun getSocModel(): String? {
        return if (Build.VERSION.SDK_INT >= 31) Build.SOC_MODEL else null
    }

    private fun getTotalRamInGB(): Int {
        return try {
            val am = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
            val mi = android.app.ActivityManager.MemoryInfo()
            am.getMemoryInfo(mi)
            ((mi.totalMem / 1_073_741_824L).coerceAtLeast(1L)).toInt()
        } catch (_: Throwable) {
            // Fallback to app heap estimate if totalMem is unavailable for any reason.
            val maxMemory = Runtime.getRuntime().maxMemory()
            ((maxMemory / 1_073_741_824L).coerceAtLeast(1L)).toInt()
        }
    }

    private fun logDeviceInfo(message: String) {
        Log.i("VocalX", message)
        Log.i("VocalX", "Model: ${Build.MODEL}")
        Log.i("VocalX", "Brand: ${Build.BRAND}")
        Log.i("VocalX", "SOC: ${getSocModel() ?: "unknown"}")
    }
}
