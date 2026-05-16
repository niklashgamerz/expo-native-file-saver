package expo.modules.pilot

import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.text.TextUtils
import android.view.accessibility.AccessibilityNodeInfo
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

class TapOptionsRecord : Record {
  @Field val x: Float = 0f
  @Field val y: Float = 0f
  @Field val duration: Int = 50
}

class SwipeOptionsRecord : Record {
  @Field val startX: Float = 0f
  @Field val startY: Float = 0f
  @Field val endX: Float = 0f
  @Field val endY: Float = 0f
  @Field val duration: Int = 300
}

class ElementQueryRecord : Record {
  @Field val text: String = ""
  @Field val description: String = ""
  @Field val resourceId: String = ""
  @Field val className: String = ""
  @Field val index: Int = 0
}

class TypeTextOptionsRecord : Record {
  @Field val text: String = ""
  @Field val clearFirst: Boolean = false
}

class ScrollOptionsRecord : Record {
  @Field val direction: String = "down"
  @Field val amount: Float = 0.5f
  @Field val x: Float = -1f
  @Field val y: Float = -1f
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

class ExpoPilotModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoPilot")
    Events("onAccessibilityEvent")

    // -----------------------------------------------------------------------
    // Service status & setup
    // -----------------------------------------------------------------------
    AsyncFunction("isAccessibilityServiceEnabled") {
      val context = requireContext()
      isServiceEnabled(context)
    }

    AsyncFunction("openAccessibilitySettings") {
      val context = requireContext()
      val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      }
      context.startActivity(intent)
      true
    }

    AsyncFunction("getServiceStatus") {
      val context = requireContext()
      val enabled = isServiceEnabled(context)
      mapOf(
        "isEnabled" to enabled,
        "packageName" to context.packageName,
        "serviceName" to "${context.packageName}/.PilotAccessibilityService"
      )
    }

    // -----------------------------------------------------------------------
    // Register event listener on the service
    // -----------------------------------------------------------------------
    OnCreate {
      PilotAccessibilityService.eventListener = { type, pkg, cls, text ->
        sendEvent("onAccessibilityEvent", mapOf(
          "type" to type,
          "packageName" to pkg,
          "className" to cls,
          "text" to text,
          "timestamp" to System.currentTimeMillis()
        ))
      }
    }

    OnDestroy {
      PilotAccessibilityService.eventListener = null
    }

    // -----------------------------------------------------------------------
    // TAP at X,Y
    // -----------------------------------------------------------------------
    AsyncFunction("tap") { options: TapOptionsRecord ->
      val service = getService()
      var result = false
      val latch = java.util.concurrent.CountDownLatch(1)
      service.tap(options.x, options.y, options.duration.toLong()) {
        result = it
        latch.countDown()
      }
      latch.await(3, java.util.concurrent.TimeUnit.SECONDS)
      mapOf("success" to result, "x" to options.x, "y" to options.y)
    }

    // -----------------------------------------------------------------------
    // SWIPE
    // -----------------------------------------------------------------------
    AsyncFunction("swipe") { options: SwipeOptionsRecord ->
      val service = getService()
      var result = false
      val latch = java.util.concurrent.CountDownLatch(1)
      service.swipe(
        options.startX, options.startY,
        options.endX, options.endY,
        options.duration.toLong()
      ) { result = it; latch.countDown() }
      latch.await(5, java.util.concurrent.TimeUnit.SECONDS)
      mapOf("success" to result)
    }

    // -----------------------------------------------------------------------
    // SCROLL
    // -----------------------------------------------------------------------
    AsyncFunction("scroll") { options: ScrollOptionsRecord ->
      val context = requireContext()
      val service = getService()
      val dm = context.resources.displayMetrics
      val screenW = dm.widthPixels.toFloat()
      val screenH = dm.heightPixels.toFloat()

      val cx = if (options.x >= 0) options.x else screenW / 2
      val cy = if (options.y >= 0) options.y else screenH / 2
      val dist = options.amount

      val (x1, y1, x2, y2) = when (options.direction) {
        "up"    -> arrayOf(cx, cy + screenH * dist, cx, cy - screenH * dist)
        "down"  -> arrayOf(cx, cy - screenH * dist, cx, cy + screenH * dist)
        "left"  -> arrayOf(cx + screenW * dist, cy, cx - screenW * dist, cy)
        "right" -> arrayOf(cx - screenW * dist, cy, cx + screenW * dist, cy)
        else    -> arrayOf(cx, cy + screenH * dist, cx, cy - screenH * dist)
      }

      var result = false
      val latch = java.util.concurrent.CountDownLatch(1)
      service.swipe(x1, y1, x2, y2, 400L) { result = it; latch.countDown() }
      latch.await(5, java.util.concurrent.TimeUnit.SECONDS)
      mapOf("success" to result)
    }

    // -----------------------------------------------------------------------
    // FIND ELEMENT
    // -----------------------------------------------------------------------
    AsyncFunction("findElement") { query: ElementQueryRecord ->
      val service = getService()
      val node = service.findNodes(
        query.text.ifBlank { null },
        query.description.ifBlank { null },
        query.resourceId.ifBlank { null },
        query.className.ifBlank { null },
        query.index
      ) ?: throw Exception("No element found matching query")
      nodeToMap(node)
    }

    // -----------------------------------------------------------------------
    // FIND ALL ELEMENTS
    // -----------------------------------------------------------------------
    AsyncFunction("findElements") { query: ElementQueryRecord ->
      val service = getService()
      service.findAllNodes(
        query.text.ifBlank { null },
        query.description.ifBlank { null },
        query.resourceId.ifBlank { null },
        query.className.ifBlank { null }
      )
    }

    // -----------------------------------------------------------------------
    // TAP ELEMENT (find + click in one call)
    // -----------------------------------------------------------------------
    AsyncFunction("tapElement") { query: ElementQueryRecord ->
      val service = getService()
      val node = service.findNodes(
        query.text.ifBlank { null },
        query.description.ifBlank { null },
        query.resourceId.ifBlank { null },
        query.className.ifBlank { null },
        query.index
      ) ?: throw Exception("No element found matching query")
      val success = service.clickNode(node)
      mapOf("success" to success, "element" to nodeToMap(node))
    }

    // -----------------------------------------------------------------------
    // TYPE TEXT into focused element
    // -----------------------------------------------------------------------
    AsyncFunction("typeText") { query: ElementQueryRecord, options: TypeTextOptionsRecord ->
      val service = getService()
      val node = service.findNodes(
        query.text.ifBlank { null },
        query.description.ifBlank { null },
        query.resourceId.ifBlank { null },
        query.className.ifBlank { null },
        query.index
      ) ?: throw Exception("No element found matching query")
      val success = service.typeText(node, options.text, options.clearFirst)
      mapOf("success" to success)
    }

    // -----------------------------------------------------------------------
    // TYPE INTO FOCUSED — types into whatever is currently focused
    // -----------------------------------------------------------------------
    AsyncFunction("typeIntoFocused") { options: TypeTextOptionsRecord ->
      val service = getService()
      val root = service.rootInActiveWindow
        ?: throw Exception("No active window")
      val focused = root.findFocus(AccessibilityNodeInfo.FOCUS_INPUT)
        ?: throw Exception("No focused input found")
      val success = service.typeText(focused, options.text, options.clearFirst)
      mapOf("success" to success)
    }

    // -----------------------------------------------------------------------
    // SCREENSHOT
    // -----------------------------------------------------------------------
    AsyncFunction("screenshot") {
      val service = getService()
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
        throw Exception("Screenshot requires Android 11+ (API 30)")
      }
      var b64: String? = null
      var w = 0; var h = 0
      val latch = java.util.concurrent.CountDownLatch(1)
      service.takeScreenshot { img, width, height ->
        b64 = img; w = width; h = height
        latch.countDown()
      }
      latch.await(10, java.util.concurrent.TimeUnit.SECONDS)
      if (b64 == null) throw Exception("Screenshot failed")
      mapOf("base64" to b64!!, "width" to w, "height" to h)
    }

    // -----------------------------------------------------------------------
    // GLOBAL ACTIONS
    // -----------------------------------------------------------------------
    AsyncFunction("pressBack")          { getService().pressBack() }
    AsyncFunction("pressHome")          { getService().pressHome() }
    AsyncFunction("pressRecents")       { getService().pressRecents() }
    AsyncFunction("openNotifications")  { getService().pressNotifications() }
    AsyncFunction("openQuickSettings")  { getService().pressQuickSettings() }
    AsyncFunction("lockScreen")         { getService().lockScreen() }

    // -----------------------------------------------------------------------
    // LAUNCH APP
    // -----------------------------------------------------------------------
    AsyncFunction("launchApp") { packageName: String ->
      val context = requireContext()
      val service = getService()
      val success = service.launchApp(context, packageName)
      mapOf("success" to success, "packageName" to packageName)
    }

    // -----------------------------------------------------------------------
    // GET CURRENT APP (what's on screen right now)
    // -----------------------------------------------------------------------
    AsyncFunction("getCurrentApp") {
      val service = getService()
      val root = service.rootInActiveWindow
      mapOf(
        "packageName" to (root?.packageName?.toString() ?: ""),
        "className"   to (root?.className?.toString() ?: "")
      )
    }

    // -----------------------------------------------------------------------
    // DUMP SCREEN — returns full accessibility tree as a flat list
    // -----------------------------------------------------------------------
    AsyncFunction("dumpScreen") {
      val service = getService()
      service.findAllNodes(null, null, null, null)
    }

    // -----------------------------------------------------------------------
    // WAIT FOR ELEMENT — polls until element appears or timeout
    // -----------------------------------------------------------------------
    AsyncFunction("waitForElement") { query: ElementQueryRecord, timeoutMs: Int ->
      val service = getService()
      val deadline = System.currentTimeMillis() + timeoutMs
      var node: AccessibilityNodeInfo? = null
      while (System.currentTimeMillis() < deadline) {
        node = service.findNodes(
          query.text.ifBlank { null },
          query.description.ifBlank { null },
          query.resourceId.ifBlank { null },
          query.className.ifBlank { null },
          query.index
        )
        if (node != null) break
        Thread.sleep(200)
      }
      if (node == null) throw Exception("Element not found within ${timeoutMs}ms")
      nodeToMap(node)
    }

    // -----------------------------------------------------------------------
    // GET SCREEN SIZE
    // -----------------------------------------------------------------------
    AsyncFunction("getScreenSize") {
      val context = requireContext()
      val dm = context.resources.displayMetrics
      mapOf(
        "width"  to dm.widthPixels,
        "height" to dm.heightPixels,
        "density" to dm.density
      )
    }

    // -----------------------------------------------------------------------
    // INSTALLED APPS
    // -----------------------------------------------------------------------
    AsyncFunction("getInstalledApps") {
      val context = requireContext()
      val pm = context.packageManager
      pm.getInstalledApplications(0).map { app ->
        mapOf(
          "packageName" to app.packageName,
          "label"       to pm.getApplicationLabel(app).toString()
        )
      }
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private fun requireContext(): Context =
    appContext.reactContext ?: throw Exception("React context not available")

  private fun getService(): PilotAccessibilityService =
    PilotAccessibilityService.instance
      ?: throw Exception(
        "Accessibility service is not running. " +
        "Call openAccessibilitySettings() and enable 'ExpoPilot' in the list."
      )

  private fun isServiceEnabled(context: Context): Boolean {
    val serviceName = "${context.packageName}/expo.modules.pilot.PilotAccessibilityService"
    val enabled = Settings.Secure.getString(
      context.contentResolver,
      Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
    ) ?: return false
    val splitter = TextUtils.SimpleStringSplitter(':')
    splitter.setString(enabled)
    while (splitter.hasNext()) {
      if (splitter.next().equals(serviceName, ignoreCase = true)) return true
    }
    return false
  }

  private fun nodeToMap(node: AccessibilityNodeInfo): Map<String, Any> {
    val bounds = android.graphics.Rect()
    node.getBoundsInScreen(bounds)
    return mapOf(
      "text"        to (node.text?.toString() ?: ""),
      "description" to (node.contentDescription?.toString() ?: ""),
      "resourceId"  to (node.viewIdResourceName ?: ""),
      "className"   to (node.className?.toString() ?: ""),
      "bounds"      to mapOf(
        "left" to bounds.left, "top" to bounds.top,
        "right" to bounds.right, "bottom" to bounds.bottom
      ),
      "centerX"     to bounds.centerX(),
      "centerY"     to bounds.centerY(),
      "isClickable" to node.isClickable,
      "isEditable"  to node.isEditable,
      "isScrollable" to node.isScrollable,
      "isEnabled"   to node.isEnabled,
      "packageName" to (node.packageName?.toString() ?: "")
    )
  }
}
