const path = require('path');

module.exports = {
  entry: {
    provider: './client/src/provider.ts'
  },
  devtool: 'inline-source-map',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.(zip)/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'assets/',
        }
      }
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname,'..', 'public', 'js'),
  },
};