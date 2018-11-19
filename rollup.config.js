import configGenerator from '@ovh-ux/component-rollup-config';

// generate your configuration with global options
const config = configGenerator({
  input: './src/index.js',
});

// export desired list of target(s)
export default [
  // CommonJS
  config.cjs(),
  // UMD (Universal Module Definition)
  config.umd({
    output: {
      globals: {
        angular: 'angular',
        jquery: '$',
      },
    },
  }),
];
