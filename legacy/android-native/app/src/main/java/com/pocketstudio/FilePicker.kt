package com.vocalx.ui.common

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue

/**
 * A composable that provides a file picker functionality.
 *
 * This composable uses the `rememberLauncherForActivityResult` with `ActivityResultContracts.GetContent`
 * to launch the system file picker. It allows the user to select a file and returns the
 * content URI of the selected file.
 *
 * @param onFileSelected A callback that is invoked when a file is selected. The callback receives the content URI of the selected file.
 * @param content The composable content that triggers the file picker. This is typically a button or an icon.
 */
@Composable
fun FilePicker(
    mimeType: String = "*/*",
    onFileSelected: (Uri) -> Unit,
    content: @Composable (()->Unit) -> Unit
) {
    var launchPicker by remember { mutableStateOf(false) }

    val launcher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent(),
        onResult = { uri: Uri? ->
            uri?.let {
                onFileSelected(it)
            }
        }
    )

    if (launchPicker) {
        LaunchedEffect(Unit) {
            launcher.launch(mimeType) // Launch the file picker
            launchPicker = false // Reset the state
        }
    }

    content {
        launchPicker = true
    }
}
