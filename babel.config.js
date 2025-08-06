// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: "nativewind" }],
      'nativewind/babel',
    ],
    plugins: [
      
      ['module-resolver',
        {alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@assets': './src/assets',
          },
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
