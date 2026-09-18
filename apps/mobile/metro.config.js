const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. surveiller l'ensemble des fichiers du monorepo
config.watchFolders = [workspaceRoot];

// 2. Définir les dossiers node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Mapper explicitement les packages monorepo
config.resolver.extraNodeModules = {
  '@appsurvey/shared': path.resolve(workspaceRoot, 'packages/shared'),
  '@appsurvey/clmrs-engine': path.resolve(workspaceRoot, 'packages/clmrs-engine'),
};

module.exports = config;
