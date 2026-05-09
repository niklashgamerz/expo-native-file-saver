export type StorageLocation =
  | 'downloads'
  | 'documents'
  | 'pictures'
  | 'music'
  | 'movies'
  | 'cache'
  | 'custom';

export type SaveFileOptions = {
  /** File content as base64 string or plain UTF-8 text */
  data: string;
  /** Filename including extension e.g. "report.pdf" */
  fileName: string;
  /** MIME type e.g. "application/pdf", "image/png", "text/plain" */
  mimeType: string;
  /** Where to save the file (default: 'downloads') */
  location?: StorageLocation;
  /** Sub-folder within the location e.g. "MyApp/Reports" */
  subDirectory?: string;
  /** Required when location is 'custom' — absolute path to target directory */
  customPath?: string;
  /** If true, treats data as base64 encoded. Default: false */
  isBase64?: boolean;
  /** If true and file already exists, overwrite it. Default: true */
  overwrite?: boolean;
};

export type SaveFileResult = {
  success: boolean;
  filePath: string;
  message: string;
};

export type GetDirectoryPathOptions = {
  location: StorageLocation;
  subDirectory?: string;
  customPath?: string;
};
