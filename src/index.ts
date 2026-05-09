import ExpoNativeFileSaverModule from './ExpoNativeFileSaverModule';
import type {
  SaveFileOptions,
  SaveFileResult,
  GetDirectoryPathOptions,
  StorageLocation,
} from './ExpoNativeFileSaver.types';

export { StorageLocation };
export type { SaveFileOptions, SaveFileResult, GetDirectoryPathOptions };

/**
 * Save a file to a specific location on the device.
 *
 * @example
 * // Save a plain text file to Downloads
 * const result = await saveFile({
 *   data: 'Hello World!',
 *   fileName: 'hello.txt',
 *   mimeType: 'text/plain',
 *   location: 'downloads',
 * });
 *
 * @example
 * // Save a base64-encoded PDF to a sub-folder in Documents
 * const result = await saveFile({
 *   data: base64PdfString,
 *   fileName: 'invoice.pdf',
 *   mimeType: 'application/pdf',
 *   location: 'documents',
 *   subDirectory: 'MyApp/Invoices',
 *   isBase64: true,
 * });
 */
export async function saveFile(options: SaveFileOptions): Promise<SaveFileResult> {
  return ExpoNativeFileSaverModule.saveFile(options);
}

/**
 * Get the absolute path for a given storage location.
 * Useful to display the save path to the user before saving.
 */
export async function getDirectoryPath(
  options: GetDirectoryPathOptions
): Promise<string> {
  return ExpoNativeFileSaverModule.getDirectoryPath(options);
}

/**
 * Check if a file already exists at the given path.
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
