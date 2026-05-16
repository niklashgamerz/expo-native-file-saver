/**
 * withNativePatches.js
 *
 * Redirects two broken native modules to vendored copies during expo prebuild.
 *
 * Strategy — append to settings.gradle instead of find/replace:
 *   Expo SDK 54 + RN 0.81 uses `expoAutolinking.useExpoModules()` to
 *   dynamically include modules via the Gradle settings plugin.  There are no
 *   static `project(':name').projectDir = …` lines to replace.
 *   However, Gradle processes settings.gradle top-to-bottom and the LAST
 *   `project(':name').projectDir` assignment wins, so appending our overrides
 *   at the end is sufficient.
 *
 * No @expo/config-plugins import — wires the mod directly on config.mods.
 */
module.exports = function withNativePatches(config) {
  if (!config.mods) config.mods = {};
  if (!config.mods.android) config.mods.android = {};

  const prev = config.mods.android.settingsGradle;

  config.mods.android.settingsGradle = async (modConfig) => {
    if (prev) modConfig = await prev(modConfig);

    const overrides = [
      '',
      '// [withNativePatches] Redirect broken modules to vendored source copies.',
      '// The last projectDir assignment wins in Gradle settings evaluation.',
      "project(':expo-native-file-saver').projectDir = new File(rootProject.projectDir, '../vendor/expo-native-file-saver/android')",
      "project(':expo-pilot').projectDir = new File(rootProject.projectDir, '../vendor/expo-pilot/android')",
    ].join('\n');

    if (!modConfig.modResults.contents.includes('[withNativePatches]')) {
      modConfig.modResults.contents += overrides;
      console.log('[withNativePatches] ✅ Appended projectDir overrides to settings.gradle');
    }

    return modConfig;
  };

  return config;
};
