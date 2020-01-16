const path = require('path')
const webpack = require('webpack')
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const JSON5 = require('json5')
const { version } = require('./package.json');

module.exports = {
  mode: process.env.NODE_ENV,
  context: __dirname + '/src',
  optimization: {
    minimize: false
  },
  entry: {
    'background': './background.js',
    'content-script': './content-script.js',
    'popup/popup': './popup/popup.js',
    'options/options': './options/options.js',
    'devtools/devtools': './devtools/devtools.js',
    'devtools/devtools-panel': './devtools/devtools-panel.js',
    //'devtools/sandbox': './devtools/sandbox.js'
  },
  output: {
    path: path.resolve(__dirname, './dist'),
    filename: '[name].js'
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          'vue-style-loader',
          'css-loader'
        ],
      },      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          loaders: {
          }
          // other vue-loader options go here
        }
      },
      {
        test: /\.js$/,
        loader: 'babel-loader',
        exclude: /node_modules/
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      }
    ]
  },
  resolve: {
    alias: {
      'vue$': 'vue/dist/vue.esm.js',
    },
    extensions: ['*', '.js', '.vue', '.json']
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true,
    overlay: true
  },
  performance: {
    hints: false
  },
  devtool: '#eval-source-map',
  plugins: [
    new webpack.DefinePlugin({
      global: 'window',
    }),
    new VueLoaderPlugin(),
    new MiniCssExtractPlugin({
      filename: '[name].css',
    }),
    new CopyWebpackPlugin([
      { from: 'icons', to: 'icons' },
      { from: 'popup/popup.html', to: 'popup/popup.html' },
      { from: 'options/options.html', to: 'options/options.html' },
      { from: 'devtools/devtools.html', to: 'devtools/devtools.html' },
      { from: 'devtools/devtools-panel.html', to: 'devtools/devtools-panel.html' },
      //{ from: 'devtools/sandbox.html', to: 'devtools/sandbox.html' },
      //{ from: 'devtools/css/devtools-panel.css', to: 'devtools/css/devtools-panel.css' },
      {
        from: 'manifest.json',
        to: 'manifest.json',
        transform: (content) => {
          const result = JSON5.parse(content.toString());
          
          result.version = version;

          // if (config.mode === 'development') {
          //   result['content_security_policy'] = "script-src 'self' 'unsafe-eval'; object-src 'self'";
          // }

          return Buffer.from(JSON.stringify(result, null, 2));
        },
      },
    ]),
  ]
}

if (process.env.NODE_ENV === 'production') {
  module.exports.devtool = '#source-map'
  // http://vue-loader.vuejs.org/en/workflow/production.html
  module.exports.plugins = (module.exports.plugins || []).concat([
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: '"production"'
      }
    }),

    new webpack.LoaderOptionsPlugin({
      minimize: false
    })
  ])
}
