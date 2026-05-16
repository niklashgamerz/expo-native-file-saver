const PATCH = `
// Fix: expo-modules-core 55.x requires @JvmDefaultWithCompatibility -> needs -Xjvm-default=all
subprojects {
    tasks.withType(org.jetbrains.kotlin.gradle.tasks.KotlinCompile).configureEach {
        kotlinOptions {
            freeCompilerArgs += ["-Xjvm-default=all"]
        }
    }
}
`;

module.exports = function withKotlinJvmDefault(config) {
  if (!config.mods) config.mods = {};
  if (!config.mods.android) config.mods.android = {};

  const prev = config.mods.android.projectBuildGradle;

  config.mods.android.projectBuildGradle = async (modConfig) => {
    if (prev) modConfig = await prev(modConfig);
    if (!modConfig.modResults.contents.includes("-Xjvm-default=all")) {
      modConfig.modResults.contents += PATCH;
    }
    return modConfig;
  };

  return config;
};
