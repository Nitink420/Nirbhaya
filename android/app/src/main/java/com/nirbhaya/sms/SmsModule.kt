package com.nirbhaya.sms

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.telephony.SmsManager
import androidx.core.content.ContextCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger

/**
 * Sends SMS directly through Android's [SmsManager] - fully offline, no SMS app UI.
 *
 * JS: `NativeModules.SmsModule.sendSms(phone, message): Promise<{status, phone, parts}>`
 *
 * The promise resolves with status "sent" once the radio confirms the message left the
 * device (via a sent-PendingIntent), or "queued" if no confirmation arrives within
 * [SEND_TIMEOUT_MS]. It rejects with an E_* error code on failure.
 */
class SmsModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  companion object {
    const val NAME = "SmsModule"
    private const val SEND_TIMEOUT_MS = 20_000L
    private const val ACTION_PREFIX = "com.nirbhaya.SMS_SENT_"
    private val requestCounter = AtomicInteger(0)
  }

  private val mainHandler = Handler(Looper.getMainLooper())

  override fun getName(): String = NAME

  @ReactMethod
  fun canSendSms(promise: Promise) {
    promise.resolve(hasTelephony() && hasSmsPermission())
  }

  @ReactMethod
  fun sendSms(phone: String, message: String, promise: Promise) {
    val number = phone.trim()
    if (number.isEmpty()) {
      promise.reject("E_INVALID_PHONE", "Phone number is empty")
      return
    }
    if (!hasSmsPermission()) {
      promise.reject("E_PERMISSION", "SEND_SMS permission not granted")
      return
    }
    if (!hasTelephony()) {
      promise.reject("E_NO_TELEPHONY", "This device cannot send SMS")
      return
    }

    try {
      val smsManager = getSmsManager()
      val parts = smsManager.divideMessage(message)
      val requestId = requestCounter.incrementAndGet()
      val action = ACTION_PREFIX + requestId
      val settled = AtomicBoolean(false)
      val remaining = AtomicInteger(parts.size)
      var failureCode = Activity.RESULT_OK
      var receiver: BroadcastReceiver? = null

      fun settle(block: () -> Unit) {
        if (settled.compareAndSet(false, true)) {
          receiver?.let { r -> runCatching { reactContext.unregisterReceiver(r) } }
          block()
        }
      }

      val timeout = Runnable {
        settle { promise.resolve(result("queued", number, parts.size)) }
      }

      receiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
          if (resultCode != Activity.RESULT_OK) failureCode = resultCode
          if (remaining.decrementAndGet() > 0) return
          mainHandler.removeCallbacks(timeout)
          settle {
            if (failureCode == Activity.RESULT_OK) {
              promise.resolve(result("sent", number, parts.size))
            } else {
              val (code, msg) = mapError(failureCode)
              promise.reject(code, msg)
            }
          }
        }
      }

      ContextCompat.registerReceiver(
          reactContext,
          receiver,
          IntentFilter(action),
          ContextCompat.RECEIVER_NOT_EXPORTED,
      )

      val sentIntents = ArrayList<PendingIntent>(parts.size)
      for (i in parts.indices) {
        val intent = Intent(action).setPackage(reactContext.packageName)
        sentIntents.add(
            PendingIntent.getBroadcast(
                reactContext,
                requestId * 100 + i,
                intent,
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_ONE_SHOT,
            ),
        )
      }

      mainHandler.postDelayed(timeout, SEND_TIMEOUT_MS)

      if (parts.size > 1) {
        smsManager.sendMultipartTextMessage(number, null, parts, sentIntents, null)
      } else {
        smsManager.sendTextMessage(number, null, message, sentIntents[0], null)
      }
    } catch (e: SecurityException) {
      promise.reject("E_PERMISSION", e.message ?: "SEND_SMS permission denied", e)
    } catch (e: Exception) {
      promise.reject("E_SEND_FAILED", e.message ?: "Failed to send SMS", e)
    }
  }

  @Suppress("DEPRECATION")
  private fun getSmsManager(): SmsManager =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
        reactContext.getSystemService(SmsManager::class.java) ?: SmsManager.getDefault()
      } else {
        SmsManager.getDefault()
      }

  private fun hasSmsPermission(): Boolean =
      ContextCompat.checkSelfPermission(reactContext, Manifest.permission.SEND_SMS) ==
          PackageManager.PERMISSION_GRANTED

  private fun hasTelephony(): Boolean =
      reactContext.packageManager.hasSystemFeature(PackageManager.FEATURE_TELEPHONY)

  private fun result(status: String, phone: String, parts: Int) =
      Arguments.createMap().apply {
        putString("status", status)
        putString("phone", phone)
        putInt("parts", parts)
      }

  private fun mapError(code: Int): Pair<String, String> =
      when (code) {
        SmsManager.RESULT_ERROR_NO_SERVICE -> "E_NO_SERVICE" to "No cellular service"
        SmsManager.RESULT_ERROR_RADIO_OFF -> "E_RADIO_OFF" to "Radio is off (airplane mode?)"
        SmsManager.RESULT_ERROR_NULL_PDU -> "E_NULL_PDU" to "Carrier rejected the message"
        SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "E_GENERIC_FAILURE" to "Generic SMS failure"
        else -> "E_SEND_FAILED" to "SMS failed with code $code"
      }
}
