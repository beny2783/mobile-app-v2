const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@supabase/supabase-js']
    }
  }, argv);

  // Customize the config before returning it.
  if (config.resolve) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native': 'react-native-web'
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
      process: false
    };
  }

  return config;
};