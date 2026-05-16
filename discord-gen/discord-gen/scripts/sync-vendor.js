#!/usr/bin/env node
/**
 * sync-vendor.js
 *
 * Keeps the vendor/ directory in sync with node_modules after a native module
 * version bump. Run after any pnpm install that changes expo-native-file-saver
 * or expo-pilot versions:
 *
 *   pnpm --filter @workspace/discord-gen run sync-vendor
 *
 * What it does for each vendored module:
 *   1. Resolves the real package path in the pnpm store
 *   2. Copies its android/ directory into vendor/{module}/android/
 *   3. Re-applies our patches (full-file replacements from patches/)
 *   4. Reports which files changed vs. what was already there
 */

const fs   = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Module registry — add new vendored modules here
// ---------------------------------------------------------------------------
const MODULES = [
  {
    name: 'expo-native-file-saver',
    androidSrc: 'android',
    // Root-level files needed by expo-module-gradle-plugin (reads project.projectDir.parentFile)
    rootFiles: ['expo-module.config.json', 'package.json'],
    patches: [
      {
        from: 'patches/expo-native-file-saver/android/src/main/java/expo/modules/nativefilesaver/ExpoNativeFileSaverModule.kt',
        to:   'vendor/expo-native-file-saver/android/src/main/java/expo/modules/nativefilesaver/ExpoNativeFileSaverModule.kt',
      },
    ],
  },
  {
    name: 'expo-pilot',
    androidSrc: 'android',
    // Root-level files needed by expo-module-gradle-plugin (reads project.projectDir.parentFile)
    rootFiles: ['expo-module.config.json', 'package.json'],
    patches: [
      {
        from: 'patches/expo-pilot/android/src/main/java/expo/modules/pilot/PilotAccessibilityService.kt',
        to:   'vendor/expo-pilot/android/src/main/java/expo/modules/pilot/PilotAccessibilityService.kt',
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findPackageRoot(startDir, pkgName) {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, 'node_modules', pkgName);
    if (fs.existsSync(candidate)) {
      try { return fs.realpathSync(candidate); } catch (_) { return candidate; }
    }
    const parent = path.dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function fileChanged(a, b) {
  if (!fs.existsSync(b)) return true;
  return fs.readFileSync(a).toString() !== fs.readFileSync(b).toString();
}

function readVersion(pkgRoot) {
  try {
    return JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8')).version;
  } catch (_) {
    return '?';
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

let anyError = false;

for (const mod of MODULES) {
  console.log(`\n── ${mod.name} ──`);

  const pkgRoot = findPackageRoot(PROJECT_ROOT, mod.name);
  if (!pkgRoot) {
    console.error(`  ❌ Not found in node_modules — run pnpm install first`);
    anyError = true;
    continue;
  }

  const version = readVersion(pkgRoot);
  console.log(`  Installed: v${version} (${pkgRoot})`);

  // 1. Copy android source from node_modules → vendor
  const androidSrc  = path.join(pkgRoot, mod.androidSrc);
  const androidDest = path.join(PROJECT_ROOT, 'vendor', mod.name, mod.androidSrc);

  if (!fs.existsSync(androidSrc)) {
    console.error(`  ❌ android/ directory not found at ${androidSrc}`);
    anyError = true;
    continue;
  }

  console.log(`  Syncing android/ from node_modules…`);
  copyDirSync(androidSrc, androidDest);
  console.log(`  ✅ Copied android/`);

  // 2. Copy root-level files required by expo-module-gradle-plugin
  //    The plugin reads project.projectDir.parentFile, which is vendor/{mod}/
  for (const rootFile of (mod.rootFiles || [])) {
    const src  = path.join(pkgRoot, rootFile);
    const dest = path.join(PROJECT_ROOT, 'vendor', mod.name, rootFile);
    if (!fs.existsSync(src)) {
      console.warn(`  ⚠️  Root file not found in package: ${rootFile}`);
      continue;
    }
    const changed = fileChanged(src, dest);
    fs.copyFileSync(src, dest);
    console.log(`  ${changed ? '✅ Copied' : '↩  Unchanged'}: ${rootFile}`);
  }

  // 3. Apply patches (overwrite files that need fixes)
  for (const patch of mod.patches) {
    const patchSrc  = path.join(PROJECT_ROOT, patch.from);
    const patchDest = path.join(PROJECT_ROOT, patch.to);

    if (!fs.existsSync(patchSrc)) {
      console.error(`  ❌ Patch source missing: ${patch.from}`);
      anyError = true;
      continue;
    }

    const changed = fileChanged(patchSrc, patchDest);
    fs.mkdirSync(path.dirname(patchDest), { recursive: true });
    fs.copyFileSync(patchSrc, patchDest);
    console.log(`  ${changed ? '✅ Applied patch' : '↩  Patch unchanged'}: ${path.basename(patch.to)}`);
  }

  // 3. Warn if the package version changed since last sync (heuristic: check build.gradle)
  const nmBuildGradle     = path.join(androidSrc,  'build.gradle');
  const vendorBuildGradle = path.join(androidDest, 'build.gradle');
  if (fs.existsSync(nmBuildGradle) && fs.existsSync(vendorBuildGradle)) {
    const nmContent     = fs.readFileSync(nmBuildGradle, 'utf8');
    const vendorContent = fs.readFileSync(vendorBuildGradle, 'utf8');
    if (nmContent !== vendorContent) {
      console.warn(
        `  ⚠️  build.gradle changed with this version upgrade — ` +
        `review patches/${mod.name}/ to ensure they still apply correctly`
      );
    }
  }
}

console.log(anyError ? '\n❌ Sync completed with errors.' : '\n✅ vendor/ is up to date.');
process.exit(anyError ? 1 : 0);
