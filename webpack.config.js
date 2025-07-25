const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        'src/popup/index': './src/popup/index.js',
        'src/background/service-worker': './src/background/service-worker.js',
        'src/content/content-script': './src/content/content-script.js',
    },
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/,
                exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-react'],
                    },
                },
            },
        ],
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'manifest.json', to: 'manifest.json' },
                { from: 'src/popup/index.html', to: 'src/popup/index.html' },
                { from: 'src/injected', to: 'src/injected' },
                { from: 'public', to: 'public' },
            ],
        }),
    ],
};
