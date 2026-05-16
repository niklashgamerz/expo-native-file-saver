<div align="center">

# 🤖 expo-pilot

**Android UI automation via Accessibility Service — tap, swipe, type, find elements across any app.**

[![npm version](https://img.shields.io/npm/v/expo-pilot?color=blue&style=flat-square)](https://www.npmjs.com/package/expo-pilot)
[![license](https://img.shields.io/github/license/niklashgamerz/expo-pilot?style=flat-square)](LICENSE)
[![platform](https://img.shields.io/badge/platform-Android-green?style=flat-square)](https://github.com/niklashgamerz/expo-pilot)
[![expo](https://img.shields.io/badge/Expo%20SDK-49%2B-blueviolet?style=flat-square)](https://expo.dev)

> ⚠️ **Android only.** iOS blocks cross-app control at the OS level.  
> ⚠️ **Requires a Development Build** — does not work with Expo Go.

</div>

---

## ✨ Features

- 👆 **Tap** at any X,Y coordinate on screen
- 👆 **Tap elements** by text, description, resource ID, or class name
- ⌨️ **Type text** into any input field across any app
- 🔍 **Find elements** — search the full accessibility tree
- ↕️ **Scroll & swipe** anywhere on screen
- 📸 **Screenshot** the current screen (Android 11+)
- 🌐 **Launch apps** by package name
- ⬅️ **Global actions** — Back, Home, Recents, Notifications, Lock Screen
- 📡 **Listen to events** — get notified of taps, focus changes, window changes
- ⏳ **waitForElement** — wait until an element appears (great for automation flows)
- 🤖 **Automate websites** inside a WebView — open a URL and control it like Selenium

---

## 📦 Installation

```sh
npx expo install expo-pilot
```

Rebuild your native app:

```sh
npx expo run:android
```

---

## 🔧 One-time Setup

expo-pilot uses Android's **Accessibility Service** — the same system that powers screen readers and assistive tools. The user needs to enable it once.

### In your app

```tsx
import { isAccessibilityServiceEnabled, openAccessibilitySettings } from 'expo-pilot';

const enabled = await isAccessibilityServiceEnabled();
if (!enabled) {
  await openAccessibilitySettings();
  // User taps "expo-pilot" in the list and toggles it ON
}
```

The included example app has a **built-in setup screen** that guides users through this automatically.

---

## 🚀 Quick Start

```tsx
import {
  isAccessibilityServiceEnabled,
  tap, tapElement, typeText,
  scroll, pressBack, launchApp,
} from 'expo-pilot';

// Tap at screen coordinates
await tap({ x: 540, y: 1200 });

// Find a button by text and tap it
await tapElement({ text: 'Sign In' });

// Type into a username field
await typeText(
  { text: 'Username' },
  { text: 'hello@example.com', clearFirst: true }
);

// Scroll down half the screen
await scroll({ direction: 'down' });

// Press the back button
await pressBack();

// Launch Chrome
await launchApp('com.android.chrome');
```

---

## 📖 API

### Service Setup

```ts
isAccessibilityServiceEnabled(): Promise<boolean>
openAccessibilitySettings(): Promise<boolean>
getServiceStatus(): Promise<{ isEnabled, packageName, serviceName }>
```

---

### Gestures

#### `tap(options)`
Tap at screen coordinates.
```ts
await tap({ x: 360, y: 800, duration: 50 });
```

#### `swipe(options)`
Swipe from one point to another.
```ts
await swipe({ startX: 360, startY: 800, endX: 360, endY: 200, duration: 300 });
```

#### `scroll(options)`
Scroll in a direction.
```ts
await scroll({ direction: 'down', amount: 0.5 }); // scroll down 50% of screen
await scroll({ direction: 'up' });
await scroll({ direction: 'left' });
await scroll({ direction: 'right' });
```

---

### Element Interaction

#### `findElement(query)` / `findElements(query)`
Find elements anywhere on screen — works across all apps.
```ts
const el = await findElement({ text: 'Submit' });
const buttons = await findElements({ className: 'android.widget.Button' });
```

#### `ElementQuery`
| Field | Type | Description |
|---|---|---|
| `text` | `string` | Partial text match |
| `description` | `string` | Content description / accessibility label |
| `resourceId` | `string` | Resource ID e.g. `"com.example:id/btn_submit"` |
| `className` | `string` | Class e.g. `"android.widget.EditText"` |
| `index` | `number` | Which match to use if multiple found (default: 0) |

#### `tapElement(query)`
Find an element and tap it in one call.
```ts
await tapElement({ text: 'OK' });
await tapElement({ text: 'OK', index: 1 }); // tap the second "OK"
await tapElement({ resourceId: 'com.example:id/login_button' });
```

#### `typeText(query, options)`
Find an input field and type into it.
```ts
await typeText(
  { text: 'Email' },
  { text: 'user@example.com', clearFirst: true }
);
```

#### `typeIntoFocused(options)`
Type into whatever input is currently focused.
```ts
await tap({ x: 360, y: 500 }); // focus the field first
await typeIntoFocused({ text: 'Hello World!', clearFirst: true });
```

#### `waitForElement(query, timeoutMs?)`
Poll until an element appears — essential for automation flows.
```ts
// Wait up to 10 seconds for a "Done" button to appear
const el = await waitForElement({ text: 'Done' }, 10000);
```

#### `dumpScreen()`
Get the complete accessibility tree of everything on screen.
```ts
const nodes = await dumpScreen();
nodes.forEach(n => console.log(n.text, n.className, n.bounds));
```

---

### System Actions

```ts
pressBack()          // ← back button
pressHome()          // ⌂ home button
pressRecents()       // ⧉ app switcher
openNotifications()  // pull down notification shade
openQuickSettings()  // pull down quick settings
lockScreen()         // lock the screen (Android 9+)
launchApp(packageName) // launch any app by package name
getCurrentApp()      // get packageName of active app
getScreenSize()      // { width, height, density }
getInstalledApps()   // list all installed apps
screenshot()         // base64 PNG (Android 11+)
```

---

### Events

Listen to real-time events from any app:

```ts
import { onAccessibilityEvent } from 'expo-pilot';

const sub = onAccessibilityEvent(({ type, packageName, text, timestamp }) => {
  console.log(`${type} in ${packageName}: "${text}"`);
});

// cleanup
sub.remove();
```

Event types: `click`, `focus`, `window_change`, `notification`

---

## 🌐 WebView Automation

Yes — you can fully automate websites inside your app using expo-pilot with a WebView. This is basically **Selenium on Android**, running inside your own Expo app.

```tsx
import { WebView } from 'react-native-webview';
import { waitForElement, tapElement, typeText, typeIntoFocused } from 'expo-pilot';

function AutomatedBrowser() {
  const handleLoad = async () => {
    // Wait for Google's search box to appear
    await waitForElement({ description: 'Search' }, 8000);

    // Tap the search box
    await tapElement({ description: 'Search' });

    // Type a query
    await typeIntoFocused({ text: 'expo modules', clearFirst: true });

    // Tap the search button
    await tapElement({ text: 'Google Search' });
  };

  return (
    <WebView
      source={{ uri: 'https://google.com' }}
      onLoadEnd={handleLoad}
    />
  );
}
```

You can automate **any website** this way — login forms, checkouts, dashboards, scraping — all from code, no user interaction needed.

---

## 💡 Automation Examples

### Auto-fill a login form

```ts
await launchApp('com.example.myapp');
await waitForElement({ text: 'Email' }, 5000);
await typeText({ text: 'Email' }, { text: 'user@example.com', clearFirst: true });
await typeText({ text: 'Password' }, { text: 'mypassword', clearFirst: true });
await tapElement({ text: 'Log In' });
```

### Scroll and find content

```ts
await launchApp('com.android.settings');
await waitForElement({ text: 'Settings' }, 3000);

// Scroll until we find "About phone"
for (let i = 0; i < 5; i++) {
  const nodes = await findElements({ text: 'About phone' });
  if (nodes.length > 0) { await tapElement({ text: 'About phone' }); break; }
  await scroll({ direction: 'down' });
}
```

### Listen and react to events

```ts
const sub = onAccessibilityEvent(async ({ type, packageName }) => {
  if (type === 'window_change' && packageName === 'com.android.chrome') {
    console.log('Chrome opened!');
    await waitForElement({ description: 'Search or type URL' }, 3000);
    await tapElement({ description: 'Search or type URL' });
    await typeIntoFocused({ text: 'https://example.com\n' });
  }
});
```

---

## ⚠️ Limitations

| Limitation | Details |
|---|---|
| Android only | iOS blocks cross-app control entirely |
| Requires dev build | Won't work in Expo Go |
| One-time user setup | User enables service in Settings once |
| Screenshot: Android 11+ | `takeScreenshot` API only available on API 30+ |
| Gestures: Android 7+ | `GestureDescription` requires API 24+ |

---

## 🤝 Contributing

Contributions welcome!

1. Fork: [github.com/niklashgamerz/expo-pilot](https://github.com/niklashgamerz/expo-pilot)
2. Branch: `git checkout -b feat/my-feature`
3. Commit: `git commit -m 'feat: add my feature'`
4. PR!

---

## 📄 License

MIT © [niklashgamerz](https://github.com/niklashgamerz)

---

<div align="center">
  Made with ❤️ for the Expo community
</div>
