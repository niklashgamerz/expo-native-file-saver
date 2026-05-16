<div align="center">

# 📁 expo-native-file-saver

**Save files natively to Downloads, Documents, Pictures and more — on Android & iOS.**

[![npm version](https://img.shields.io/npm/v/expo-native-file-saver?color=blue&style=flat-square)](https://www.npmjs.com/package/expo-native-file-saver)
[![license: MIT](https://img.shields.io/npm/l/expo-native-file-saver?style=flat-square)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Android%20%7C%20iOS-green?style=flat-square)](https://github.com/niklashgamerz/expo-native-file-saver)
[![expo](https://img.shields.io/badge/Expo%20SDK-49%2B-blueviolet?style=flat-square)](https://expo.dev)

> ⚠️ **Requires a Development Build** — does not work with Expo Go.  
> See [Why not Expo Go?](#-why-not-expo-go) below.

</div>

---

## ✨ Features

- 💾 Save files to **Downloads, Documents, Pictures, Music, Movies, Cache**, or any custom path
- 🖼️ Supports **plain text** and **base64-encoded** data (PDFs, images, ZIPs, etc.)
- 📂 Optional **sub-directory** nesting (e.g. `MyApp/Reports`)
- 🤖 Android 10+ uses the **MediaStore API** (no legacy storage permission needed)
- 🍎 iOS saves into the app sandbox, accessible via the **Files app**
- 🔧 Helpers: `getDirectoryPath`, `fileExists`, `deleteFile`
- 💙 Full **TypeScript** support

---

## 📦 Installation

```sh
npx expo install expo-native-file-saver
```

Then rebuild your native app:

```sh
# Android
npx expo run:android

# iOS
npx expo run:ios
```

---

## 🔐 Permissions

### Android

Add to your `app.json`:

```json
{
  "expo": {
    "android": {
      "permissions": [
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.READ_EXTERNAL_STORAGE"
      ]
    }
  }
}
```

> On **Android 10+** (API 29+), the module uses MediaStore and does **not** need `WRITE_EXTERNAL_STORAGE` for Downloads, Pictures, Music, and Movies.

### iOS

No extra permissions needed for saving to the app sandbox (Documents, Cache).

---

## 🚀 Quick Start

```tsx
import { saveFile } from 'expo-native-file-saver';
import { Button, Alert } from 'react-native';

export default function App() {
  const handleSave = async () => {
    const result = await saveFile({
      data: 'Hello from expo-native-file-saver!',
      fileName: 'hello.txt',
      mimeType: 'text/plain',
      location: 'downloads',
    });

    Alert.alert('Saved!', result.filePath);
  };

  return <Button title="Save File" onPress={handleSave} />;
}
```

---

## 📖 API

### `saveFile(options): Promise<SaveFileResult>`

Saves a file to the specified location.

```ts
import { saveFile } from 'expo-native-file-saver';

// Save plain text to Downloads
const result = await saveFile({
  data: 'Hello World!',
  fileName: 'hello.txt',
  mimeType: 'text/plain',
  location: 'downloads',
});

// Save a base64 PDF to Documents/MyApp/Invoices
const result = await saveFile({
  data: base64PdfString,
  fileName: 'invoice.pdf',
  mimeType: 'application/pdf',
  location: 'documents',
  subDirectory: 'MyApp/Invoices',
  isBase64: true,
});

// Save an image to Pictures
const result = await saveFile({
  data: base64ImageString,
  fileName: 'photo.png',
  mimeType: 'image/png',
  location: 'pictures',
  isBase64: true,
});

console.log(result.filePath); // absolute path where file was saved
console.log(result.success);  // true
```

#### Options

| Option | Type | Default | Description |
|---|---|---|---|
| `data` | `string` | **required** | File content — plain text or base64 string |
| `fileName` | `string` | **required** | Filename with extension e.g. `"report.pdf"` |
| `mimeType` | `string` | **required** | MIME type e.g. `"application/pdf"`, `"image/png"`, `"text/plain"` |
| `location` | `StorageLocation` | `'downloads'` | Where to save the file |
| `subDirectory` | `string` | `''` | Sub-folder within the location e.g. `"MyApp/Reports"` |
| `customPath` | `string` | `''` | Absolute path (only when `location = 'custom'`) |
| `isBase64` | `boolean` | `false` | Set `true` if `data` is base64 encoded |
| `overwrite` | `boolean` | `true` | Overwrite if a file with the same name already exists |

#### Result

```ts
{
  success: boolean;
  filePath: string;   // absolute path of the saved file
  message: string;    // human-readable status message
}
```

---

### `getDirectoryPath(options): Promise<string>`

Returns the absolute directory path for a given storage location.

```ts
import { getDirectoryPath } from 'expo-native-file-saver';

const path = await getDirectoryPath({ location: 'downloads' });
// Android → /storage/emulated/0/Download
// iOS     → /var/mobile/.../Documents
```

---

### `fileExists(filePath: string): Promise<boolean>`

```ts
import { fileExists } from 'expo-native-file-saver';

const exists = await fileExists('/storage/emulated/0/Download/hello.txt');
console.log(exists); // true or false
```

---

### `deleteFile(filePath: string): Promise<boolean>`

```ts
import { deleteFile } from 'expo-native-file-saver';

const deleted = await deleteFile('/storage/emulated/0/Download/hello.txt');
console.log(deleted); // true if deleted, false if file didn't exist
```

---

## 📂 Storage Locations

| `location` | Android | iOS |
|---|---|---|
| `downloads` | Public Downloads folder | App Documents dir |
| `documents` | App external Documents | App Documents dir |
| `pictures` | Public Pictures folder | App Documents/Pictures |
| `music` | Public Music folder | App Documents/Music |
| `movies` | Public Movies folder | App Documents/Movies |
| `cache` | App Cache dir | App Cache dir |
| `custom` | Any absolute path | Any absolute path |

---

## 💡 Common Use Cases

### Download a PDF report

```tsx
import { saveFile } from 'expo-native-file-saver';

async function downloadReport(base64Pdf: string) {
  const result = await saveFile({
    data: base64Pdf,
    fileName: `report-${Date.now()}.pdf`,
    mimeType: 'application/pdf',
    location: 'downloads',
    isBase64: true,
  });
  return result.filePath;
}
```

### Save a receipt as text

```tsx
async function saveReceipt(receiptText: string, orderId: string) {
  return await saveFile({
    data: receiptText,
    fileName: `receipt-${orderId}.txt`,
    mimeType: 'text/plain',
    location: 'documents',
    subDirectory: 'MyApp/Receipts',
  });
}
```

### Export JSON data

```tsx
async function exportData(data: object) {
  return await saveFile({
    data: JSON.stringify(data, null, 2),
    fileName: `export-${new Date().toISOString()}.json`,
    mimeType: 'application/json',
    location: 'downloads',
  });
}
```

### Save captured image

```tsx
async function saveImage(base64Image: string, name: string) {
  return await saveFile({
    data: base64Image,
    fileName: `${name}.jpg`,
    mimeType: 'image/jpeg',
    location: 'pictures',
    subDirectory: 'MyApp',
    isBase64: true,
  });
}
```

---

## ❓ Why not Expo Go?

Expo Go is a **pre-built app** with a fixed set of native modules. Adding new native code requires recompiling the native app — which Expo Go doesn't support.

This is the same reason modules like `expo-camera` and `expo-image-picker` also require a dev build for advanced features.

### Setting up a Development Build is easy:

```sh
# Install dev client
npx expo install expo-dev-client

# Build and run
npx expo run:android
npx expo run:ios
```

Or use [EAS Build](https://docs.expo.dev/build/introduction/) to build in the cloud:

```sh
npm install -g eas-cli
eas build --profile development --platform android
```

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!

1. Fork the repo
2. Create your branch: `git checkout -b feat/my-feature`
3. Commit your changes: `git commit -m 'feat: add my feature'`
4. Push to the branch: `git push origin feat/my-feature`
5. Open a Pull Request

---

## 📄 License

MIT © [niklashgamerz](https://github.com/niklashgamerz)

---

<div align="center">
  Made with ❤️ for the Expo community
</div>
