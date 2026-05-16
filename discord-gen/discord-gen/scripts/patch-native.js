#!/usr/bin/env node
/**
 * Postinstall patch script — copies pre-fixed native module files from
 * ./patches/ into node_modules to fix build errors:
 *
 * expo-native-file-saver:
 *   - Replaces deprecated appContext.registerForActivityResult with
 *     OnActivityResult hook (expo-modules-core 55 compatibility)
 *
 * expo-pilot:
 *   - Fixes ScreenshotResult.hardwareBitmap unresolved reference by using
 *     reflection-safe Java getter
 *
 * Why realpathSync + chmodSync:
 *   pnpm stores packages in a content-addressable store and uses symlinks in
 *   node_modules. The store files are often read-only (hardlinked/immutable).
 *   fs.copyFileSync(src, symlink) follows the symlink but the underlying store
 *   file may be read-only on EAS build servers. We resolve the real path first,
 *   make it writable, then overwrite it so Gradle sees the patched source.
 */
const fs = require('fs');
const path = require('path');

function copyFix(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`[patch-native] Fix file not found: ${src}`);
    return;
  }
  if (!fs.existsSync(dest)) {
    console.warn(`[patch-native] Destination not found (module not installed?): ${dest}`);
    return;
  }

  try {
    // Resolve through symlinks to get the actual file in the pnpm store
    const realDest = fs.realpathSync(dest);

    // pnpm store files can be read-only; make writable before writing
    try {
      fs.chmodSync(realDest, 0o644);
    } catch (_) {}

    fs.writeFileSync(realDest, fs.readFileSync(src));
    console.log(`[patch-native] ✅ Fixed: ${path.basename(dest)} -> ${realDest}`);
  } catch (err) {
    console.error(`[patch-native] ❌ Failed to patch ${path.basename(dest)}: ${err.message}`);
    process.exit(1);
  }
}

/**
 * Resolve the node_modules root — in a pnpm workspace the package may live at
 * the workspace root's node_modules rather than the project's own node_modules.
 */
function findNodeModules(packageName, startDir) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'node_modules', packageName);
    if (fs.existsSync(candidate)) return path.join(dir, 'node_modules');
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // fallback to local node_modules
  return path.join(startDir, 'node_modules');
}

const projectRoot = path.join(__dirname, '..');
const patches = path.join(projectRoot, 'patches');

// Fix expo-native-file-saver
const fileSaverRoot = findNodeModules('expo-native-file-saver', projectRoot);
copyFix(
  path.join(patches, 'expo-native-file-saver/android/src/main/java/expo/modules/nativefilesaver/ExpoNativeFileSaverModule.kt'),
  path.join(fileSaverRoot, 'expo-native-file-saver/android/src/main/java/expo/modules/nativefilesaver/ExpoNativeFileSaverModule.kt')
);

// Fix expo-pilot
const pilotRoot = findNodeModules('expo-pilot', projectRoot);
copyFix(
  path.join(patches, 'expo-pilot/android/src/main/java/expo/modules/pilot/PilotAccessibilityService.kt'),
  path.join(pilotRoot, 'expo-pilot/android/src/main/java/expo/modules/pilot/PilotAccessibilityService.kt')
);

console.log('[patch-native] All patches applied.');
