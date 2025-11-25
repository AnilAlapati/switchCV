// eslint-disable-next-line @typescript-eslint/no-require-imports
const babelJest = require('babel-jest');

const transformer = babelJest.createTransformer({
  presets: [
    [
      'next/babel',
      {
        'preset-env': {},
        'preset-react': {
          runtime: 'automatic',
          importSource: 'react',
        },
      },
    ],
  ],
});

module.exports = {
  process(code, filename, config, options) {
    // Strip "use client" and "use server" directives before babel transform
    const strippedCode = code
      .replace(/^['"]use client['"];?\n?/m, '')
      .replace(/^['"]use server['"];?\n?/m, '');

    return transformer.process(strippedCode, filename, config, options);
  },
  getCacheKey(...args) {
    return transformer.getCacheKey(...args);
  },
};
