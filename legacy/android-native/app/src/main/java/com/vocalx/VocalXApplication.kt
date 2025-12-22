package com.vocalx

import android.app.Application
import android.util.Log
import com.vocalx.ai.DeviceDetector
import com.vocalx.ai.DevicePerformanceTier

class VocalXApplication : Application() {
    override fun onCreate() {
        super.onCreate()

        val tier = DeviceDetector(this).detectTier()
        when (tier) {
            DevicePerformanceTier.PREMIUM_AI -> Log.i("VocalX", "Device tier: PREMIUM_AI")
            DevicePerformanceTier.MID_PREMIUM_AI -> Log.i("VocalX", "Device tier: MID_PREMIUM_AI")
            DevicePerformanceTier.NON_AI -> Log.w("VocalX", "Device tier: NON_AI (not supported)")
        }
    }
}


