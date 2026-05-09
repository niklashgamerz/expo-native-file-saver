package expo.modules.nativefilesaver

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Base64
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

// ---------------------------------------------------------------------------
// Records
// ---------------------------------------------------------------------------

class SaveFileOptionsRecord : Record {
  @Field val data: String = ""
  @Field val fileName: String = ""
  @Field val mimeType: String = "application/octet-stream"
  // SAF dialog (default true = shows native "Save to..." picker)
  @Field val showDialog: Boolean = true
  // Silent-save fallback fields (used when showDialog = false)
  @Field val location: String = "downloads"
  @Field val subDirectory: String = ""
  @Field val customPath: String = ""
  @Field val isBase64: Boolean = false
  @Field val overwrite: Boolean = true
}

class GetDirectoryPathOptionsRecord : Record {
  @Field val location: String = "downloads"
  @Field val subDirectory: String = ""
  @Field val customPath: String = ""
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

class ExpoNativeFileSaverModule : Module() {

  companion object {
    private const val REQ_SAVE = 9421
    private const val REQ_OPEN = 9422
  }

  // Pending activity-result callbacks
  private val saveCallbacks = mutableMapOf<Int, (Int, Intent?) -> Unit>()

  override fun definition() = ModuleDefinition {
    Name("ExpoNativeFileSaver")

    // -----------------------------------------------------------------------
    // saveFile
    // -----------------------------------------------------------------------
    AsyncFunction("saveFile") { options: SaveFileOptionsRecord ->
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")

      val bytes: ByteArray = if (options.isBase64)
        Base64.decode(options.data, Base64.DEFAULT)
      else
        options.data.toByteArray(Charsets.UTF_8)

      // Silent save — no dialog, same as old behaviour
      if (!options.showDialog) {
        return@AsyncFunction if (
          Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
          options.location in listOf("downloads", "pictures", "music", "movies")
        ) {
          saveViaMediaStore(context, options, bytes)
        } else {
          saveViaFile(context, options, bytes)
        }
      }

      // ---- SAF: show the native "Save to…" dialog -------------------------
      val activity = appContext.activityProvider?.currentActivity
        ?: throw Exception("No active Activity — cannot show SAF dialog")

      val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = options.mimeType
        putExtra(Intent.EXTRA_TITLE, options.fileName)
      }

      val latch = CountDownLatch(1)
      var result: Map<String, Any> = mapOf(
        "success" to false,
        "filePath" to "",
        "uri" to "",
        "message" to "User cancelled"
      )

      appContext.registerForActivityResult(REQ_SAVE) { resultCode, data ->
        if (resultCode == Activity.RESULT_OK) {
          val uri: Uri? = data?.data
          if (uri == null) {
            result = mapOf("success" to false, "filePath" to "", "uri" to "",
              "message" to "No URI returned from picker")
          } else {
            try {
              context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                ?: throw Exception("Cannot open output stream")
              result = mapOf(
                "success" to true,
                "filePath" to uri.toString(),
                "uri" to uri.toString(),
                "message" to "File saved: ${options.fileName}"
              )
            } catch (e: Exception) {
              result = mapOf("success" to false, "filePath" to "", "uri" to "",
                "message" to "Write failed: ${e.message}")
            }
          }
        }
        latch.countDown()
      }

      activity.startActivityForResult(intent, REQ_SAVE)
      latch.await(5, TimeUnit.MINUTES)
      result
    }

    // -----------------------------------------------------------------------
    // openFilePicker — SAF "Open" dialog, returns URI + metadata
    // -----------------------------------------------------------------------
    AsyncFunction("openFilePicker") { mimeTypes: List<String> ->
      val activity = appContext.activityProvider?.currentActivity
        ?: throw Exception("No active Activity — cannot show file picker")
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")

      val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
        addCategory(Intent.CATEGORY_OPENABLE)
        type = if (mimeTypes.size == 1) mimeTypes[0] else "*/*"
        if (mimeTypes.size > 1)
          putExtra(Intent.EXTRA_MIME_TYPES, mimeTypes.toTypedArray())
      }

      val latch = CountDownLatch(1)
      var result: Map<String, Any> = mapOf("cancelled" to true, "uri" to "",
        "fileName" to "", "mimeType" to "")

      appContext.registerForActivityResult(REQ_OPEN) { resultCode, data ->
        if (resultCode == Activity.RESULT_OK) {
          val uri = data?.data
          if (uri != null) {
            val mime = context.contentResolver.getType(uri) ?: "*/*"
            val name = resolveFileName(context, uri)
            result = mapOf("cancelled" to false, "uri" to uri.toString(),
              "fileName" to name, "mimeType" to mime)
          }
        }
        latch.countDown()
      }

      activity.startActivityForResult(intent, REQ_OPEN)
      latch.await(5, TimeUnit.MINUTES)
      result
    }

    // -----------------------------------------------------------------------
    // readFile — read a SAF URI as text or base64
    // -----------------------------------------------------------------------
    AsyncFunction("readFile") { uriString: String, asBase64: Boolean ->
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")
      val uri = Uri.parse(uriString)
      val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
        ?: throw Exception("Cannot read file at: $uriString")
      if (asBase64) Base64.encodeToString(bytes, Base64.NO_WRAP)
      else bytes.toString(Charsets.UTF_8)
    }

    // -----------------------------------------------------------------------
    // getDirectoryPath
    // -----------------------------------------------------------------------
    AsyncFunction("getDirectoryPath") { options: GetDirectoryPathOptionsRecord ->
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")
      resolveDirectory(context, options.location, options.subDirectory, options.customPath)
        .absolutePath
    }

    // -----------------------------------------------------------------------
    // fileExists
    // -----------------------------------------------------------------------
    AsyncFunction("fileExists") { filePath: String ->
      File(filePath).exists()
    }

    // -----------------------------------------------------------------------
    // deleteFile
    // -----------------------------------------------------------------------
    AsyncFunction("deleteFile") { filePath: String ->
      val file = File(filePath)
      if (file.exists()) file.delete() else false
    }
  }

  // -------------------------------------------------------------------------
  // Silent MediaStore save (Android 10+)
  // -------------------------------------------------------------------------
  private fun saveViaMediaStore(
    context: Context,
    options: SaveFileOptionsRecord,
    bytes: ByteArray
  ): Map<String, Any> {
    val collection = when (options.location) {
      "pictures" -> MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      "music"    -> MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      "movies"   -> MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else       -> MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    }

    val relPath = buildRelativePath(
      when (options.location) {
        "pictures" -> Environment.DIRECTORY_PICTURES
        "music"    -> Environment.DIRECTORY_MUSIC
        "movies"   -> Environment.DIRECTORY_MOVIES
        else       -> Environment.DIRECTORY_DOWNLOADS
      }, options.subDirectory
    )

    val cv = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, options.fileName)
      put(MediaStore.MediaColumns.MIME_TYPE, options.mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, relPath)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }

    val resolver = context.contentResolver
    val uri = resolver.insert(collection, cv)
      ?: throw Exception("MediaStore insert failed for ${options.fileName}")

    resolver.openOutputStream(uri)?.use { it.write(bytes) }
      ?: throw Exception("Cannot open output stream")

    cv.clear()
    cv.put(MediaStore.MediaColumns.IS_PENDING, 0)
    resolver.update(uri, cv, null, null)

    val filePath = resolver.query(uri, arrayOf(MediaStore.MediaColumns.DATA),
      null, null, null)?.use { c ->
      if (c.moveToFirst()) c.getString(0) else uri.toString()
    } ?: uri.toString()

    return mapOf("success" to true, "filePath" to filePath, "uri" to uri.toString(),
      "message" to "Saved to ${options.location}: ${options.fileName}")
  }

  // -------------------------------------------------------------------------
  // Silent direct File save (pre-Q or app-private dirs)
  // -------------------------------------------------------------------------
  private fun saveViaFile(
    context: Context,
    options: SaveFileOptionsRecord,
    bytes: ByteArray
  ): Map<String, Any> {
    val dir = resolveDirectory(context, options.location, options.subDirectory, options.customPath)
    if (!dir.exists()) dir.mkdirs()

    val file = File(dir, options.fileName)
    if (file.exists() && !options.overwrite)
      return mapOf("success" to false, "filePath" to file.absolutePath, "uri" to "",
        "message" to "File already exists and overwrite is disabled.")

    FileOutputStream(file).use { it.write(bytes) }
    return mapOf("success" to true, "filePath" to file.absolutePath, "uri" to "",
      "message" to "Saved to ${file.absolutePath}")
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private fun resolveDirectory(
    context: Context, location: String, subDirectory: String, customPath: String
  ): File {
    val base: File = when (location) {
      "downloads" -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
      "pictures"  -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
      "music"     -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)
      "movies"    -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
      "documents" -> context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS) ?: context.filesDir
      "cache"     -> context.cacheDir
      "custom"    -> if (customPath.isNotBlank()) File(customPath)
                     else throw Exception("customPath must be set when location is 'custom'")
      else        -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    }
    return if (subDirectory.isNotBlank()) File(base, subDirectory) else base
  }

  private fun buildRelativePath(base: String, subDirectory: String): String =
    if (subDirectory.isNotBlank()) "$base/$subDirectory" else base

  private fun resolveFileName(context: Context, uri: Uri): String {
    context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
      val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
      if (cursor.moveToFirst() && idx >= 0) return cursor.getString(idx)
    }
    return uri.lastPathSegment ?: "unknown"
  }
}
