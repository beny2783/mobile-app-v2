const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const Dotenv = require('dotenv-webpack');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAddModulePathsToTranspile: ['@supabase/supabase-js'],
      },
    },
    argv
  );

  // Remove existing DefinePlugin instances
  config.plugins = config.plugins.filter((plugin) => !(plugin instanceof webpack.DefinePlugin));

  // Add our own DefinePlugin with merged environment variables
  config.plugins.push(
    new webpack.DefinePlugin({
      'process.env': JSON.stringify(process.env),
      __DEV__: process.env.NODE_ENV !== 'production',
      global: 'window',
    })
  );

  // Add Dotenv plugin
  config.plugins.push(new Dotenv());

  // Customize the config before returning it.
  if (config.resolve) {
    config.resolve.alias = {
      ...config.resolve.alias,
      'react-native': 'react-native-web',
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: false,
      stream: false,
      buffer: false,
      process: false,
    };
  }

  return config;
};
