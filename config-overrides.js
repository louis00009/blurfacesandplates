module.exports = function override(config) {
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
        "crypto": require.resolve("crypto-browserify"),
        "stream": require.resolve("stream-browserify"),
        "path": require.resolve("path-browserify"),
        "fs": false,
    })
    config.resolve.fallback = fallback;
    
    // Suppress source map warnings from face-api.js
    config.ignoreWarnings = [
        /Failed to parse source map/,
        /Critical dependency: the request of a dependency is an expression/
    ];
    
    // Disable source maps for node_modules to reduce warnings
    if (config.module && config.module.rules) {
        config.module.rules.push({
            test: /\.js$/,
            enforce: 'pre',
            use: ['source-map-loader'],
            exclude: /node_modules/
        });
    }
    
    return config;
}