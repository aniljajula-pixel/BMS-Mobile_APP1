const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Comment out or remove this for SDK 52 (not needed)
// config.resolver.unstable_enablePackageExports = false;

module.exports = config;