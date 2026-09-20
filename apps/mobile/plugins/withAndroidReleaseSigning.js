/**
 * Ensures Android release builds use credentials/keystore.properties
 * (same key as credentials.json for EAS local credentialsSource).
 */
const { withAppBuildGradle } = require('@expo/config-plugins');

const RELEASE_SIGNING_BLOCK = `
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            def keystorePropertiesFile = rootProject.file("../credentials/keystore.properties")
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile rootProject.file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
`;

function withAndroidReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Replace default signingConfigs { debug { ... } } block if release is missing
    if (!contents.includes('keystore.properties')) {
      contents = contents.replace(
        /signingConfigs\s*\{[\s\S]*?\n    \}/m,
        RELEASE_SIGNING_BLOCK.trimEnd()
      );
    }

    // Point release buildType at signingConfigs.release when keystore exists
    if (contents.includes('signingConfig signingConfigs.debug') && contents.includes('release {')) {
      contents = contents.replace(
        /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
        `$1// Prefer release keystore when present; fallback debug for local-only without credentials
            def _ks = rootProject.file("../credentials/keystore.properties")
            if (_ks.exists()) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`
      );
    }

    cfg.modResults.contents = contents;
    return cfg;
  });
}

module.exports = withAndroidReleaseSigning;
