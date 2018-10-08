const webpack = require('webpack');
const path = require('path');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const RemcalcPlugin = require('less-plugin-remcalc');

const config = {
  mode: 'development',
  devtool: 'inline-source-map',
  entry: './src/otrs.module.js',
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: './ovh-angular-otrs.min.js',
  },
  module: {
    rules: [
      {
        test: /\.html$/,
        loader: 'raw-loader',
      },
      {
        test: /\.(png|jpg|gif|svg|eot|ttf|woff|woff2)$/,
        loader: 'url-loader',
        options: {
          limit: 10000,
        },
      },
      {
        test: /\.less$/,
        use: [
          {
            loader: 'style-loader', // creates style nodes from JS strings
          }, {
            loader: 'css-loader', // translates CSS into CommonJS
          },
          {
            loader: 'resolve-url-loader',
          },
          {
            loader: 'less-loader', // compiles Less to CSS
            options: {
              sourceMap: true,
              plugins: [
                RemcalcPlugin,
              ],
              paths: [
                path.resolve(__dirname, '../../node_modules'),
                path.resolve(__dirname, 'node_modules'),
              ],
            },
          },
        ],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
              plugins: [
                '@babel/plugin-syntax-dynamic-import',
                'angularjs-annotate',
              ],
            },
          },
        ],
      },
    ],
  },
  plugins: [
    new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
      jquery: 'jquery',
      'window.jQuery': 'jquery',
    }),
    new ngAnnotatePlugin({
      add: true,
      // other ng-annotate options here
    }),
  ],
};

module.exports = config;
