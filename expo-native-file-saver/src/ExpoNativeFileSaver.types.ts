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
  /**
   * Whether to show the native Android "Save to..." file picker dialog.
   * Default: true — shows the SAF GUI so the user picks where to save.
   * Set to false for a silent background save (old behaviour).
   */
  showDialog?: boolean;
  // --- Options below only apply when showDialog is false ---
  /** Where to save silently (default: 'downloads') */
  location?: StorageLocation;
  /** Sub-folder within the location e.g. "MyApp/Reports" */
  subDirectory?: string;
  /** Required when location is 'custom' */
  customPath?: string;
  /** If true, treats data as base64 encoded. Default: false */
  isBase64?: boolean;
  /** Overwrite if file exists. Default: true */
  overwrite?: boolean;
};

export type SaveFileResult = {
  success: boolean;
  /** Absolute file path or SAF content URI */
  filePath: string;
  /** SAF content URI (set when showDialog: true) */
  uri: string;
  message: string;
};

export type OpenFileResult = {
  cancelled: boolean;
  /** SAF content URI of the picked file */
  uri: string;
  fileName: string;
  mimeType: string;
};

export type GetDirectoryPathOptions = {
  location: StorageLocation;
  subDirectory?: string;
  customPath?: string;
};
