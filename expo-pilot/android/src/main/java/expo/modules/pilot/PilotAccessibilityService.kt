package expo.modules.pilot

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.graphics.Bitmap
import android.graphics.Path
import android.graphics.Rect
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import java.io.ByteArrayOutputStream
import android.util.Base64

class PilotAccessibilityService : AccessibilityService() {

  companion object {
    var instance: PilotAccessibilityService? = null
      private set

    // Listeners registered by the module
    var eventListener: ((type: String, pkg: String, cls: String, text: String) -> Unit)? = null
  }

  override fun onServiceConnected() {
    instance = this
    android.util.Log.d("ExpoPilot", "Accessibility service connected")
  }

  override fun onDestroy() {
    super.onDestroy()
    instance = null
  }

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    event ?: return
    val type = when (event.eventType) {
      AccessibilityEvent.TYPE_VIEW_CLICKED       -> "click"
      AccessibilityEvent.TYPE_VIEW_FOCUSED       -> "focus"
      AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED -> "window_change"
      AccessibilityEvent.TYPE_NOTIFICATION_STATE_CHANGED -> "notification"
      else -> return
    }
    eventListener?.invoke(
      type,
      event.packageName?.toString() ?: "",
      event.className?.toString() ?: "",
      event.text.joinToString(" ")
    )
  }

  override fun onInterrupt() {}

  // -------------------------------------------------------------------------
  // Tap at coordinates using GestureDescription
  // -------------------------------------------------------------------------
  fun tap(x: Float, y: Float, duration: Long = 50L, callback: (Boolean) -> Unit) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      callback(false); return
    }
    val path = Path().apply { moveTo(x, y) }
    val stroke = GestureDescription.StrokeDescription(path, 0, duration)
    val gesture = GestureDescription.Builder().addStroke(stroke).build()
    dispatchGesture(gesture, object : GestureResultCallback() {
      override fun onCompleted(g: GestureDescription) = callback(true)
      override fun onCancelled(g: GestureDescription) = callback(false)
    }, Handler(Looper.getMainLooper()))
  }

  // -------------------------------------------------------------------------
  // Swipe gesture
  // -------------------------------------------------------------------------
  fun swipe(x1: Float, y1: Float, x2: Float, y2: Float, duration: Long = 300L, callback: (Boolean) -> Unit) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) {
      callback(false); return
    }
    val path = Path().apply { moveTo(x1, y1); lineTo(x2, y2) }
    val stroke = GestureDescription.StrokeDescription(path, 0, duration)
    val gesture = GestureDescription.Builder().addStroke(stroke).build()
    dispatchGesture(gesture, object : GestureResultCallback() {
      override fun onCompleted(g: GestureDescription) = callback(true)
      override fun onCancelled(g: GestureDescription) = callback(false)
    }, Handler(Looper.getMainLooper()))
  }

  // -------------------------------------------------------------------------
  // Find nodes matching a query across the full window hierarchy
  // -------------------------------------------------------------------------
  fun findNodes(
    text: String?,
    description: String?,
    resourceId: String?,
    className: String?,
    index: Int
  ): AccessibilityNodeInfo? {
    val root = rootInActiveWindow ?: return null
    val results = mutableListOf<AccessibilityNodeInfo>()

    fun search(node: AccessibilityNodeInfo) {
      var match = true
      if (!text.isNullOrBlank()) {
        val nodeText = node.text?.toString() ?: ""
        if (!nodeText.contains(text, ignoreCase = true)) match = false
      }
      if (!description.isNullOrBlank()) {
        val nodeDesc = node.contentDescription?.toString() ?: ""
        if (!nodeDesc.contains(description, ignoreCase = true)) match = false
      }
      if (!resourceId.isNullOrBlank()) {
        val nodeId = node.viewIdResourceName ?: ""
        if (!nodeId.contains(resourceId, ignoreCase = true)) match = false
      }
      if (!className.isNullOrBlank()) {
        val nodeCls = node.className?.toString() ?: ""
        if (!nodeCls.contains(className, ignoreCase = true)) match = false
      }
      if (match) results.add(node)
      for (i in 0 until node.childCount) {
        node.getChild(i)?.let { search(it) }
      }
    }

    search(root)
    return results.getOrNull(index)
  }

  // -------------------------------------------------------------------------
  // Get all nodes as a list of maps
  // -------------------------------------------------------------------------
  fun findAllNodes(
    text: String?,
    description: String?,
    resourceId: String?,
    className: String?
  ): List<Map<String, Any>> {
    val root = rootInActiveWindow ?: return emptyList()
    val results = mutableListOf<Map<String, Any>>()

    fun search(node: AccessibilityNodeInfo) {
      var match = true
      if (!text.isNullOrBlank()) {
        val t = node.text?.toString() ?: ""
        if (!t.contains(text, ignoreCase = true)) match = false
      }
      if (!description.isNullOrBlank()) {
        val d = node.contentDescription?.toString() ?: ""
        if (!d.contains(description, ignoreCase = true)) match = false
      }
      if (!resourceId.isNullOrBlank()) {
        val r = node.viewIdResourceName ?: ""
        if (!r.contains(resourceId, ignoreCase = true)) match = false
      }
      if (!className.isNullOrBlank()) {
        val c = node.className?.toString() ?: ""
        if (!c.contains(className, ignoreCase = true)) match = false
      }
      if (match) {
        val bounds = Rect()
        node.getBoundsInScreen(bounds)
        results.add(mapOf(
          "text" to (node.text?.toString() ?: ""),
          "description" to (node.contentDescription?.toString() ?: ""),
          "resourceId" to (node.viewIdResourceName ?: ""),
          "className" to (node.className?.toString() ?: ""),
          "bounds" to mapOf(
            "left" to bounds.left,
            "top" to bounds.top,
            "right" to bounds.right,
            "bottom" to bounds.bottom
          ),
          "centerX" to bounds.centerX(),
          "centerY" to bounds.centerY(),
          "isClickable" to node.isClickable,
          "isEditable" to node.isEditable,
          "isScrollable" to node.isScrollable,
          "isEnabled" to node.isEnabled,
          "packageName" to (node.packageName?.toString() ?: "")
        ))
      }
      for (i in 0 until node.childCount) {
        node.getChild(i)?.let { search(it) }
      }
    }

    search(root)
    return results
  }

  // -------------------------------------------------------------------------
  // Click a found node
  // -------------------------------------------------------------------------
  fun clickNode(node: AccessibilityNodeInfo): Boolean {
    // Try accessibility action first (works even without coordinates)
    if (node.isClickable) {
      return node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    }
    // Fall back to gesture tap at center
    val bounds = Rect()
    node.getBoundsInScreen(bounds)
    var success = false
    tap(bounds.centerX().toFloat(), bounds.centerY().toFloat()) { success = it }
    return success
  }

  // -------------------------------------------------------------------------
  // Type text into focused/editable node
  // -------------------------------------------------------------------------
  fun typeText(node: AccessibilityNodeInfo, text: String, clearFirst: Boolean): Boolean {
    if (!node.isEditable) return false
    node.performAction(AccessibilityNodeInfo.ACTION_ACCESSIBILITY_FOCUS)
    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
    if (clearFirst) {
      node.performAction(AccessibilityNodeInfo.ACTION_SET_SELECTION,
        android.os.Bundle().apply {
          putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_START_INT, 0)
          putInt(AccessibilityNodeInfo.ACTION_ARGUMENT_SELECTION_END_INT,
            node.text?.length ?: 0)
        })
    }
    val args = android.os.Bundle().apply {
      putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text)
    }
    return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, args)
  }

  // -------------------------------------------------------------------------
  // Screenshot using MediaProjection-free method (accessibility window content)
  // -------------------------------------------------------------------------
  fun takeScreenshot(callback: (String?, Int, Int) -> Unit) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      takeScreenshot(android.view.Display.DEFAULT_DISPLAY,
        mainExecutor,
        object : TakeScreenshotCallback {
          override fun onSuccess(result: ScreenshotResult) {
            try {
              // Use Java getter to avoid Kotlin synthetic property resolution issues
              // across different compileSdk versions
              val hardwareBmp: Bitmap = result.javaClass
                .getMethod("getHardwareBitmap")
                .invoke(result) as? Bitmap
                ?: run { callback(null, 0, 0); return }
              val softBmp = hardwareBmp.copy(Bitmap.Config.ARGB_8888, false)
              val baos = ByteArrayOutputStream()
              softBmp.compress(Bitmap.CompressFormat.PNG, 90, baos)
              val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
              callback(b64, softBmp.width, softBmp.height)
              hardwareBmp.recycle()
              softBmp.recycle()
            } catch (e: Exception) {
              android.util.Log.e("ExpoPilot", "Screenshot failed: ${e.message}")
              callback(null, 0, 0)
            }
          }
          override fun onFailure(errorCode: Int) = callback(null, 0, 0)
        })
    } else {
      callback(null, 0, 0)
    }
  }

  // -------------------------------------------------------------------------
  // Global actions
  // -------------------------------------------------------------------------
  fun pressBack() = performGlobalAction(GLOBAL_ACTION_BACK)
  fun pressHome() = performGlobalAction(GLOBAL_ACTION_HOME)
  fun pressRecents() = performGlobalAction(GLOBAL_ACTION_RECENTS)
  fun pressNotifications() = performGlobalAction(GLOBAL_ACTION_NOTIFICATIONS)
  fun pressQuickSettings() = performGlobalAction(GLOBAL_ACTION_QUICK_SETTINGS)
  fun lockScreen() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
    performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN) else false

  // -------------------------------------------------------------------------
  // Launch app by package name
  // -------------------------------------------------------------------------
  fun launchApp(context: android.content.Context, packageName: String): Boolean {
    return try {
      val intent = context.packageManager.getLaunchIntentForPackage(packageName)
        ?: return false
      intent.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
      true
    } catch (e: Exception) { false }
  }
}
