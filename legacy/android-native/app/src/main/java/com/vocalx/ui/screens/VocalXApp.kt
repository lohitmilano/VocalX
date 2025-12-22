package com.vocalx.ui.screens

import android.net.Uri
import androidx.compose.runtime.*
import androidx.compose.material3.*
import androidx.compose.foundation.layout.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.Alignment
import android.content.Context
import androidx.compose.ui.platform.LocalContext
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import com.vocalx.ai.DeviceDetector
import com.vocalx.ai.DevicePerformanceTier
import com.vocalx.ai.models.SAMAudioModelManager
import com.vocalx.ai.models.QueryEncoder
import com.vocalx.domain.SeparationPipeline
import com.vocalx.ui.common.FilePicker
import com.vocalx.utils.ContentUriUtils
import com.vocalx.utils.ShareUtils
import java.io.File

@Composable
fun VocalXApp(context: Context) {

    val deviceDetector = remember { DeviceDetector(context) }
    val deviceTier = remember { deviceDetector.detectTier() }

    when (deviceTier) {
        DevicePerformanceTier.PREMIUM_AI -> {
            val modelManager = remember { SAMAudioModelManager(context) }
            val queryEncoder = remember { QueryEncoder(context) }
            VocalXStudioScreen(
                modelManager = modelManager,
                queryEncoder = queryEncoder,
                deviceTier = "Tier 1 (Premium)"
            )
        }
        DevicePerformanceTier.MID_PREMIUM_AI -> {
            val modelManager = remember { SAMAudioModelManager(context) }
            val queryEncoder = remember { QueryEncoder(context) }
            VocalXStudioScreen(
                modelManager = modelManager,
                queryEncoder = queryEncoder,
                deviceTier = "Tier 2 (Mid-Premium)"
            )
        }
        DevicePerformanceTier.NON_AI -> {
            IncompatibleDeviceScreen()
        }
    }
}

@Composable
fun IncompatibleDeviceScreen() {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            "VocalX Requires AI-Enabled Phone",
            style = MaterialTheme.typography.headlineMedium
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "This app requires a dedicated AI accelerator (NPU).\n\n" +
            "Supported devices:\n" +
            "• Pixel 9 series\n" +
            "• Galaxy S24 series\n" +
            "• iPhone 15+\n" +
            "• OnePlus 12+",
            style = MaterialTheme.typography.bodyMedium
        )
    }
}

@Composable
fun VocalXStudioScreen(
    modelManager: SAMAudioModelManager,
    queryEncoder: QueryEncoder,
    deviceTier: String
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()

    var query by remember { mutableStateOf("") }
    var isProcessing by remember { mutableStateOf(false) }
    var latencyMs by remember { mutableStateOf(0L) }
    var progress by remember { mutableStateOf(0f) }
    var selectedUri by remember { mutableStateOf<Uri?>(null) }
    var selectedName by remember { mutableStateOf<String?>(null) }
    var lastError by remember { mutableStateOf<String?>(null) }
    var outputFile by remember { mutableStateOf<File?>(null) }
    var inputMeta by remember { mutableStateOf<String?>(null) }
    var enableSpanPrompt by remember { mutableStateOf(false) }
    var spanStartSecText by remember { mutableStateOf("0") }
    var spanEndSecText by remember { mutableStateOf("") }
    var localInitDone by remember { mutableStateOf(false) }
    var localInitError by remember { mutableStateOf<String?>(null) }
    // NOTE: Visual prompting (tap object in video) will be added as an on-device SAM3+SAM-Audio flow.
    // This is the placeholder state for upcoming visual UI.

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp)
    ) {
        Text("VocalX Studio - $deviceTier")

        Spacer(modifier = Modifier.height(12.dp))

        FilePicker(
            // Allow both audio and video containers. We will extract the audio track.
            mimeType = "*/*",
            onFileSelected = { uri ->
                selectedUri = uri
                selectedName = ContentUriUtils.getFileName(context, uri)
                outputFile = null
                latencyMs = 0L
                progress = 0f
                lastError = null
                inputMeta = null
            }
        ) { onClick ->
            Button(onClick = onClick) {
                Text(if (selectedUri == null) "Select audio/video file" else "Change file")
            }
        }

        selectedName?.let { name ->
            Spacer(modifier = Modifier.height(8.dp))
            Text("Selected: $name", style = MaterialTheme.typography.bodyMedium)
        }

        inputMeta?.let { meta ->
            Spacer(modifier = Modifier.height(4.dp))
            Text(meta, style = MaterialTheme.typography.bodySmall)
        }

        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            label = { Text("What to extract?") },
            placeholder = { Text("e.g., 'extract vocals'") },
            modifier = Modifier
                .fillMaxWidth()
                .padding(bottom = 16.dp)
        )

        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            Switch(checked = enableSpanPrompt, onCheckedChange = { enableSpanPrompt = it })
            Spacer(modifier = Modifier.width(8.dp))
            Text("Span prompt (time range)")
        }

        if (enableSpanPrompt) {
            Spacer(modifier = Modifier.height(8.dp))
            Row(modifier = Modifier.fillMaxWidth()) {
                OutlinedTextField(
                    value = spanStartSecText,
                    onValueChange = { spanStartSecText = it },
                    label = { Text("Start (sec)") },
                    modifier = Modifier.weight(1f)
                )
                Spacer(modifier = Modifier.width(8.dp))
                OutlinedTextField(
                    value = spanEndSecText,
                    onValueChange = { spanEndSecText = it },
                    label = { Text("End (sec)") },
                    placeholder = { Text("blank = end") },
                    modifier = Modifier.weight(1f)
                )
            }
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Tip: This is the Android equivalent of SAM Audio's span prompting (process only this time range).",
                style = MaterialTheme.typography.bodySmall
            )
        }

        Button(
            onClick = {
                val uri = selectedUri ?: return@Button
                isProcessing = true
                lastError = null
                outputFile = null
                progress = 0f

                val spanMs: LongRange? = if (enableSpanPrompt) {
                    val startSec = spanStartSecText.toLongOrNull() ?: 0L
                    val endSec = spanEndSecText.toLongOrNull()
                    val startMs = (startSec.coerceAtLeast(0) * 1000L)
                    val endMs = ((endSec ?: Long.MAX_VALUE).coerceAtLeast(0) * 1000L)
                    startMs..endMs
                } else null

                val anchorsJson: String? = if (enableSpanPrompt) {
                    val startSec = spanStartSecText.toDoubleOrNull() ?: 0.0
                    val endSec = spanEndSecText.toDoubleOrNull()
                    // Meta SAM-Audio processor expects anchors like: [[["+", start, end]]]
                    // (We only support a single positive span in UI for now.)
                    val end = endSec ?: (startSec + 0.5)
                    """[[["+", $startSec, $end]]]"""
                } else null

                scope.launch {
                    try {
                        // Lazy init to prevent launch-time crashes on real devices.
                        if (!localInitDone) {
                            try {
                                withContext(Dispatchers.Default) {
                                    modelManager.initializeModel()
                                    queryEncoder.initialize()
                                }
                                localInitDone = true
                                localInitError = null
                            } catch (t: Throwable) {
                                localInitError = t.message ?: t.toString()
                                throw t
                            }
                        }

                        val result = withContext(Dispatchers.Default) {
                            SeparationPipeline.run(
                                context = context,
                                inputUri = uri,
                                query = query,
                                spanMs = spanMs,
                                modelManager = modelManager,
                                queryEncoder = queryEncoder,
                                onProgress = { p ->
                                    // Ensure Compose state updates happen on the main thread.
                                    scope.launch { progress = p }
                                }
                            )
                        }
                        latencyMs = result.latencyMs
                        val spanInfo = result.appliedSpanMs?.let { " span=${it.first}..${it.last}ms" } ?: ""
                        inputMeta = "Decoded: ${result.decoded.sampleRateHz}Hz, ch=${result.decoded.channelCount}, dur=${result.decoded.durationMs}ms$spanInfo"
                        outputFile = result.outputFile
                    } catch (t: Throwable) {
                        lastError = t.message ?: t.toString()
                    } finally {
                        isProcessing = false
                        progress = progress.coerceIn(0f, 1f)
                    }
                }
            },
            enabled = query.isNotEmpty() && selectedUri != null && !isProcessing
        ) {
            Text(if (isProcessing) "Processing..." else "Extract (offline)")
        }

        localInitError?.let { err ->
            Spacer(modifier = Modifier.height(12.dp))
            Text("Local model init failed: $err", color = MaterialTheme.colorScheme.error)
        }

        if (isProcessing) {
            Spacer(modifier = Modifier.height(12.dp))
            LinearProgressIndicator(progress = progress, modifier = Modifier.fillMaxWidth())
            Spacer(modifier = Modifier.height(4.dp))
            Text("${(progress * 100).toInt()}%", style = MaterialTheme.typography.bodySmall)
        }

        if (latencyMs > 0) {
            Spacer(modifier = Modifier.height(12.dp))
            Text("Processed in ${latencyMs}ms")
        }

        lastError?.let { err ->
            Spacer(modifier = Modifier.height(12.dp))
            Text("Error: $err", color = MaterialTheme.colorScheme.error)
        }

        outputFile?.let { file ->
            Spacer(modifier = Modifier.height(16.dp))
            Text("Output: ${file.name}", style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Button(onClick = { ShareUtils.shareAudioFile(context, file) }) {
                Text("Share WAV")
            }
        }
    }
}
