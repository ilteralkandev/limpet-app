// Xcode sandboxes build-script phases (ENABLE_USER_SCRIPT_SANDBOXING = YES) in the generated
// project. CocoaPods' "Copy Pods Resources" script writes Pods/resources-to-copy-<target>.txt,
// which the sandbox denies for the widget extension:
//   Sandbox: bash deny(1) file-write-create .../Pods/resources-to-copy-ExpoWidgetsTarget.txt
// Turn it off for every target and configuration of the generated project.
const { withXcodeProject } = require('expo/config-plugins');

module.exports = function withScriptSandboxingOff(config) {
  return withXcodeProject(config, (config) => {
    const configurations = config.modResults.pbxXCBuildConfigurationSection();
    for (const key of Object.keys(configurations)) {
      const buildSettings = configurations[key]?.buildSettings;
      if (buildSettings) buildSettings.ENABLE_USER_SCRIPT_SANDBOXING = 'NO';
    }
    return config;
  });
};
