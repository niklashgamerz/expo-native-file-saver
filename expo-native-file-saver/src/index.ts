import ExpoNativeFileSaverModule from './ExpoNativeFileSaverModule';
import type {
  SaveFileOptions,
  SaveFileResult,
  OpenFileResult,
  GetDirectoryPathOptions,
  StorageLocation,
} from './ExpoNativeFileSaver.types';

export { StorageLocation };
export type { SaveFileOptions, SaveFileResult, OpenFileResult, GetDirectoryPathOptions };

/**
 * Save a file using the native Android "Save to..." dialog (SAF).
 *
 * By default (showDialog: true) this opens the exact GUI you see in the
 * screenshot — user picks the folder, renames if they want, taps Save.
 *
 * Set showDialog: false for a silent background save (no dialog).
 *
 * @example
 * // Show native save dialog (recommended)
 * const result = await saveFile({
 *   data: pdfBase64,
 *   fileName: 'report.pdf',
 *   mimeType: 'application/pdf',
 *   isBase64: true,
 * });
 *
 * @example
 * // Silent save directly to Downloads (no dialog)
 * const result = await saveFile({
 *   data: 'Hello!',
 *   fileName: 'hello.txt',
 *   mimeType: 'text/plain',
 *   showDialog: false,
 *   location: 'downloads',
 * });
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
  return ExpoNativeFileSaverModule.saveFile({
    showDialog: true, // default to showing the dialog
    ...options,
  });
}

/**
 * Open the native Android file picker so the user can choose a file to open.
 * Returns a SAF URI you can pass to readFile().
 *
 * @example
 * const picked = await openFilePicker(['application/pdf', 'image/*']);
 * if (!picked.cancelled) {
 *   const content = await readFile(picked.uri, false);
 * }
 */
export async function openFilePicker(
  mimeTypes: string[] = ['*/*']
): Promise<OpenFileResult> {
  return ExpoNativeFileSaverModule.openFilePicker(mimeTypes);
}

/**
 * Read a file by its SAF URI (returned from openFilePicker).
 * @param uriString  SAF content URI e.g. "content://..."
 * @param asBase64   If true returns base64, otherwise UTF-8 text
 */
export async function readFile(
  uriString: string,
  asBase64: boolean = false
): Promise<string> {
  return ExpoNativeFileSaverModule.readFile(uriString, asBase64);
}

/**
 * Get the absolute path for a given storage location.
 */
export async function getDirectoryPath(
  options: GetDirectoryPathOptions
): Promise<string> {
  return ExpoNativeFileSaverModule.getDirectoryPath(options);
}

/**
 * Check if a file exists at the given absolute path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  return ExpoNativeFileSaverModule.fileExists(filePath);
}

/**
 * Delete a file at the given absolute path.
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  return ExpoNativeFileSaverModule.deleteFile(filePath);
}
