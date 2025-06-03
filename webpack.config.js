const path = require('path');

const config = {
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
};

const beslistHandlerConfig = Object.assign({}, Object.assign(config, {
    optimization: {
        minimize: false
    },
}), {
    entry: './ts/beslist-handler.ts',
    output: {
        filename: 'beslist-handler.js',
        path: path.resolve(__dirname, 'view/frontend/web/js')
    },
});

const beslistHandlerMinifiedConfig = Object.assign({}, Object.assign(config, {
    optimization: {
        minimize: true
    },
}), {
    entry: './ts/beslist-handler.ts',
    output: {
        filename: 'beslist-handler.min.js',
        path: path.resolve(__dirname, 'view/frontend/web/js')
    },
});

module.exports = [
    beslistHandlerConfig,
    beslistHandlerMinifiedConfig,
];
