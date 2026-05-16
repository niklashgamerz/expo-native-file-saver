import ExpoModulesCore
import Foundation

// ---------------------------------------------------------------------------
// Argument records
// ---------------------------------------------------------------------------

struct SaveFileOptionsRecord: Record {
  @Field var data: String = ""
  @Field var fileName: String = ""
  @Field var mimeType: String = "application/octet-stream"
  @Field var location: String = "downloads"
  @Field var subDirectory: String = ""
  @Field var customPath: String = ""
  @Field var isBase64: Bool = false
  @Field var overwrite: Bool = true
}

struct GetDirectoryPathOptionsRecord: Record {
  @Field var location: String = "downloads"
  @Field var subDirectory: String = ""
  @Field var customPath: String = ""
}

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

public class ExpoNativeFileSaverModule: Module {

  public func definition() -> ModuleDefinition {
    Name("ExpoNativeFileSaver")

    // -----------------------------------------------------------------------
    // saveFile
    // -----------------------------------------------------------------------
    AsyncFunction("saveFile") { (options: SaveFileOptionsRecord) -> [String: Any] in
      let bytes: Data
      if options.isBase64 {
        guard let decoded = Data(base64Encoded: options.data, options: .ignoreUnknownCharacters) else {
          throw NSError(domain: "ExpoNativeFileSaver", code: 1,
                        userInfo: [NSLocalizedDescriptionKey: "Invalid base64 data"])
        }
        bytes = decoded
      } else {
        guard let utf8 = options.data.data(using: .utf8) else {
          throw NSError(domain: "ExpoNativeFileSaver", code: 2,
                        userInfo: [NSLocalizedDescriptionKey: "Could not encode string as UTF-8"])
        }
        bytes = utf8
      }

      let dir = try resolveDirectory(
        location: options.location,
        subDirectory: options.subDirectory,
        customPath: options.customPath
      )

      // Create directory if needed
      try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)

      let fileURL = dir.appendingPathComponent(options.fileName)

      if FileManager.default.fileExists(atPath: fileURL.path) && !options.overwrite {
        return [
          "success": false,
          "filePath": fileURL.path,
          "message": "File already exists and overwrite is disabled."
        ]
      }

      try bytes.write(to: fileURL, options: .atomic)

      return [
        "success": true,
        "filePath": fileURL.path,
        "message": "File saved to \(fileURL.path)"
      ]
    }

    // -----------------------------------------------------------------------
    // getDirectoryPath
    // -----------------------------------------------------------------------
    AsyncFunction("getDirectoryPath") { (options: GetDirectoryPathOptionsRecord) -> String in
      let dir = try resolveDirectory(
        location: options.location,
        subDirectory: options.subDirectory,
        customPath: options.customPath
      )
      return dir.path
    }

    // -----------------------------------------------------------------------
    // fileExists
    // -----------------------------------------------------------------------
    AsyncFunction("fileExists") { (filePath: String) -> Bool in
      return FileManager.default.fileExists(atPath: filePath)
    }

    // -----------------------------------------------------------------------
    // deleteFile
    // -----------------------------------------------------------------------
    AsyncFunction("deleteFile") { (filePath: String) -> Bool in
      guard FileManager.default.fileExists(atPath: filePath) else { return false }
      try FileManager.default.removeItem(atPath: filePath)
      return true
    }
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private func resolveDirectory(location: String, subDirectory: String, customPath: String) throws -> URL {
    let fm = FileManager.default

    let base: URL
    switch location {
    case "downloads", "documents":
      // iOS doesn't have a public Downloads; use app Documents instead
      guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Documents directory"])
      }
      base = docs
    case "pictures":
      // Store in app Documents/Pictures (public Photo Library requires PHPhotoLibrary)
      guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Documents directory"])
      }
      base = docs.appendingPathComponent("Pictures")
    case "music":
      guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Documents directory"])
      }
      base = docs.appendingPathComponent("Music")
    case "movies":
      guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Documents directory"])
      }
      base = docs.appendingPathComponent("Movies")
    case "cache":
      guard let cache = fm.urls(for: .cachesDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 4,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Cache directory"])
      }
      base = cache
    case "custom":
      guard !customPath.isEmpty else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 5,
                      userInfo: [NSLocalizedDescriptionKey: "customPath must be set when location is 'custom'"])
      }
      base = URL(fileURLWithPath: customPath)
    default:
      guard let docs = fm.urls(for: .documentDirectory, in: .userDomainMask).first else {
        throw NSError(domain: "ExpoNativeFileSaver", code: 3,
                      userInfo: [NSLocalizedDescriptionKey: "Cannot access Documents directory"])
      }
      base = docs
    }

    if subDirectory.isEmpty {
      return base
    }
    return base.appendingPathComponent(subDirectory)
  }
}
