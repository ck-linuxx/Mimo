const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
/** @type {import('expo/metro-config').MetroConfig} */

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');

// Fix: "Cannot read property '__extends' of undefined" no Hermes.
// O echarts/zrender importa tslib de forma que o Metro resolve para uma
// entrada ESM que o Hermes não suporta. O custom resolveRequest abaixo
// força TODAS as importações de tslib a usar o arquivo CJS local.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'tslib' || moduleName.endsWith('/tslib')) {
    return {
      filePath: path.resolve(__dirname, './node_modules/tslib/tslib.js'),
      type: 'sourceFile',
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
