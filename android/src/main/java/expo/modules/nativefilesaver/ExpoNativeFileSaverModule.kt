package expo.modules.nativefilesaver

import android.content.ContentValues
import android.content.Context
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.io.FileOutputStream
import android.util.Base64

// ---------------------------------------------------------------------------
// Record types (mirrors TypeScript SaveFileOptions / GetDirectoryPathOptions)
// ---------------------------------------------------------------------------

class SaveFileOptionsRecord : Record {
  @Field val data: String = ""
  @Field val fileName: String = ""
  @Field val mimeType: String = "application/octet-stream"
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
// Module definition
// ---------------------------------------------------------------------------

class ExpoNativeFileSaverModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("ExpoNativeFileSaver")

    // -----------------------------------------------------------------------
    // saveFile
    // -----------------------------------------------------------------------
    AsyncFunction("saveFile") { options: SaveFileOptionsRecord ->
      val context = appContext.reactContext
        ?: throw Exception("React context is not available")

      val bytes: ByteArray = if (options.isBase64) {
        Base64.decode(options.data, Base64.DEFAULT)
      } else {
        options.data.toByteArray(Charsets.UTF_8)
      }

      // On Android 10+ (API 29+) use MediaStore for public directories
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        options.location in listOf("downloads", "pictures", "music", "movies")
      ) {
        saveViaMediaStore(context, options, bytes)
      } else {
        saveViaFile(context, options, bytes)
      }
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
  // MediaStore save (Android 10+, public directories)
  // -------------------------------------------------------------------------
  private fun saveViaMediaStore(
    context: Context,
    options: SaveFileOptionsRecord,
    bytes: ByteArray
  ): Map<String, Any> {
    val collection = when (options.location) {
      "pictures" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        MediaStore.Images.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else MediaStore.Images.Media.EXTERNAL_CONTENT_URI
      "music" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        MediaStore.Audio.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else MediaStore.Audio.Media.EXTERNAL_CONTENT_URI
      "movies" -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        MediaStore.Video.Media.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else MediaStore.Video.Media.EXTERNAL_CONTENT_URI
      else -> if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q)
        MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
      else null
    }

    // Fallback for older APIs or null collection
    if (collection == null) {
      return saveViaFile(context, options, bytes)
    }

    val relativePath = when (options.location) {
      "pictures" -> buildRelativePath(Environment.DIRECTORY_PICTURES, options.subDirectory)
      "music"    -> buildRelativePath(Environment.DIRECTORY_MUSIC, options.subDirectory)
      "movies"   -> buildRelativePath(Environment.DIRECTORY_MOVIES, options.subDirectory)
      else       -> buildRelativePath(Environment.DIRECTORY_DOWNLOADS, options.subDirectory)
    }

    val contentValues = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, options.fileName)
      put(MediaStore.MediaColumns.MIME_TYPE, options.mimeType)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
        put(MediaStore.MediaColumns.IS_PENDING, 1)
      }
    }

    val resolver = context.contentResolver
    val uri = resolver.insert(collection, contentValues)
      ?: throw Exception("Failed to create MediaStore entry for ${options.fileName}")

    resolver.openOutputStream(uri)?.use { stream ->
      stream.write(bytes)
    } ?: throw Exception("Failed to open output stream for ${options.fileName}")

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      contentValues.clear()
      contentValues.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(uri, contentValues, null, null)
    }

    // Resolve a file path for the result (best-effort on Q+)
    val filePath = resolver.query(uri, arrayOf(MediaStore.MediaColumns.DATA), null, null, null)
      ?.use { cursor ->
        if (cursor.moveToFirst()) cursor.getString(0) else uri.toString()
      } ?: uri.toString()

    return mapOf(
      "success" to true,
      "filePath" to filePath,
      "message" to "File saved to ${options.location}: ${options.fileName}"
    )
  }

  // -------------------------------------------------------------------------
  // Direct File save (app-private dirs + pre-Q public dirs)
  // -------------------------------------------------------------------------
  private fun saveViaFile(
    context: Context,
    options: SaveFileOptionsRecord,
    bytes: ByteArray
  ): Map<String, Any> {
    val dir = resolveDirectory(context, options.location, options.subDirectory, options.customPath)

    if (!dir.exists()) {
      dir.mkdirs() || throw Exception("Could not create directory: ${dir.absolutePath}")
    }

    val file = File(dir, options.fileName)

    if (file.exists() && !options.overwrite) {
      return mapOf(
        "success" to false,
        "filePath" to file.absolutePath,
        "message" to "File already exists and overwrite is disabled."
      )
    }

    FileOutputStream(file).use { it.write(bytes) }

    return mapOf(
      "success" to true,
      "filePath" to file.absolutePath,
      "message" to "File saved to ${file.absolutePath}"
    )
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------
  private fun resolveDirectory(
    context: Context,
    location: String,
    subDirectory: String,
    customPath: String
  ): File {
    val base: File = when (location) {
      "downloads" -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
      "pictures"  -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES)
      "music"     -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MUSIC)
      "movies"    -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES)
      "documents" -> context.getExternalFilesDir(Environment.DIRECTORY_DOCUMENTS)
        ?: context.filesDir
      "cache"     -> context.cacheDir
      "custom"    -> if (customPath.isNotBlank()) File(customPath)
                     else throw Exception("customPath must be provided when location is 'custom'")
      else        -> Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    }

    return if (subDirectory.isNotBlank()) File(base, subDirectory) else base
  }

  private fun buildRelativePath(base: String, subDirectory: String): String =
    if (subDirectory.isNotBlank()) "$base/$subDirectory" else base
}
