package com.example.safezone

import android.Manifest
import android.content.pm.PackageManager
import android.os.Build
import android.telephony.SmsManager
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

/**
 * Hosts the `safezone/sms` method channel: silent SMS straight from the SIM.
 *
 * The Flutter side ([SmsSender]) requests the runtime permission at a calm
 * moment (adding a trusted contact) and then sends without any composer — the
 * duress alarm must show nothing on screen. Everything here degrades safely:
 * no permission returns "no_permission" so Dart can fall back to the OS
 * composer for a normal SOS (but never for a duress one).
 */
class MainActivity : FlutterActivity() {
    private val channelName = "safezone/sms"
    private val smsPermissionRequestCode = 4711
    private var pendingPermissionResult: MethodChannel.Result? = null

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "hasSendSmsPermission" -> result.success(hasSendSmsPermission())
                    "requestSendSmsPermission" -> requestSendSmsPermission(result)
                    "sendSms" -> {
                        val recipients = call.argument<List<String>>("recipients") ?: emptyList()
                        val body = call.argument<String>("body") ?: ""
                        result.success(sendSms(recipients, body))
                    }
                    else -> result.notImplemented()
                }
            }
    }

    private fun hasSendSmsPermission(): Boolean =
        ContextCompat.checkSelfPermission(this, Manifest.permission.SEND_SMS) ==
            PackageManager.PERMISSION_GRANTED

    private fun requestSendSmsPermission(result: MethodChannel.Result) {
        if (hasSendSmsPermission()) {
            result.success(true)
            return
        }
        // A request is already in flight — don't stack a second dialog.
        if (pendingPermissionResult != null) {
            result.success(false)
            return
        }
        pendingPermissionResult = result
        ActivityCompat.requestPermissions(
            this,
            arrayOf(Manifest.permission.SEND_SMS),
            smsPermissionRequestCode,
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray,
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == smsPermissionRequestCode) {
            val granted = grantResults.isNotEmpty() &&
                grantResults[0] == PackageManager.PERMISSION_GRANTED
            pendingPermissionResult?.success(granted)
            pendingPermissionResult = null
        }
    }

    private fun sendSms(recipients: List<String>, body: String): String {
        if (!hasSendSmsPermission()) return "no_permission"
        if (recipients.isEmpty() || body.isEmpty()) return "failed"
        return try {
            val sms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                getSystemService(SmsManager::class.java)
            } else {
                @Suppress("DEPRECATION")
                SmsManager.getDefault()
            }
            for (recipient in recipients) {
                // Long messages (the maps URL pushes us over 160 chars) must be
                // split, or the send silently drops the tail.
                val parts = sms.divideMessage(body)
                if (parts.size > 1) {
                    sms.sendMultipartTextMessage(recipient, null, parts, null, null)
                } else {
                    sms.sendTextMessage(recipient, null, body, null, null)
                }
            }
            "sent"
        } catch (e: Exception) {
            "failed"
        }
    }
}
