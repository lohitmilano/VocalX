package com.vocalx.ui.common

import android.Manifest
import android.net.Uri
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import com.google.accompanist.permissions.shouldShowRationale

/**
 * A composable that handles the READ_EXTERNAL_STORAGE permission request
 * and then launches a file picker.
 *
 * @param onFileSelected A callback that is invoked with the content URI of the selected file.
 * @param content The composable content that triggers the file picker, typically a button.
 */
@OptIn(ExperimentalPermissionsApi::class)
@Composable
fun FilePickerWithPermission(
    mimeType: String = "*/*",
    onFileSelected: (Uri) -> Unit,
    content: @Composable (() -> Unit) -> Unit
) {
    val storagePermissionState = rememberPermissionState(Manifest.permission.READ_EXTERNAL_STORAGE)

    when {
        // If the permission is granted, show the file picker content
        storagePermissionState.status.isGranted -> {
            FilePicker(mimeType = mimeType, onFileSelected = onFileSelected, content = content)
        }

        // If the user should be shown a rationale, display it
        storagePermissionState.status.shouldShowRationale -> {
            PermissionRationale(permissionName = "Storage") {
                storagePermissionState.launchPermissionRequest()
            }
        }

        // If it's the first time or the permission is denied, request it
        else -> {
            // This block will be entered the first time the user sees the feature
            // or if they have permanently denied the permission.
            // We wrap the original content to trigger the permission request on click.
            content {
                storagePermissionState.launchPermissionRequest()
            }
        }
    }
}

/**
 * A composable that displays a rationale for a permission request.
 *
 * @param permissionName The name of the permission being requested (e.g., "Storage").
 * @param onRequestPermission The callback to be invoked when the user clicks the request button.
 */
@Composable
fun PermissionRationale(permissionName: String, onRequestPermission: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(16.dp)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            Text(
                text = "$permissionName Permission Required",
                style = MaterialTheme.typography.titleMedium
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "To select an audio file, you need to grant the $permissionName permission. This allows the app to access files on your device.",
                style = MaterialTheme.typography.bodyMedium
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = onRequestPermission) {
                Text("Grant Permission")
            }
        }
    }
}
