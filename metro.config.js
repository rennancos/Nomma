// https://docs.expo.dev/guides/customizing-metro/
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// .android-env guarda JDK, SDK e caches do Gradle (ver docs/ANDROID_BUILD.md); o Metro não deve indexá-lo.
config.resolver.blockList = [/[\\/]\.android-env[\\/].*/, /[\\/]builds[\\/].*/];

module.exports = config;
