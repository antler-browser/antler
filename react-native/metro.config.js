const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { FileStore } = require('metro-cache');

const projectRoot = __dirname;

// Start with Expo's default config
const config = getDefaultConfig(projectRoot);

// Use a custom cache directory to avoid conflicts
config.cacheStores = [
  new FileStore({
    root: path.join(projectRoot, '.metro-cache'),
  }),
];

// Ensure source extensions include TypeScript
config.resolver.sourceExts = [...(config.resolver.sourceExts || []), 'ts', 'tsx'];

module.exports = config;