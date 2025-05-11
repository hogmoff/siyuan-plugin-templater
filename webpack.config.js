const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

module.exports = (env, argv) => {
    const isPro = argv.mode === "production";
    // Define your custom output directory here
    const outputDir = path.resolve(__dirname, "siyuan-plugin-templater");
    const plugins = [
        new MiniCssExtractPlugin({
            filename: isPro ? "siyuan-plugin-templater/index.css" : "index.css",
        })
    ];
    let entry = {
        "index": "./src/index.ts",
    };
    if (isPro) {
        entry = {
            "./siyuan-plugin-templater/index": "./src/index.ts",
        };
        plugins.push(new webpack.BannerPlugin({
            banner: () => {
                return fs.readFileSync("LICENSE").toString();
            },
        }));

        plugins.push(new CopyPlugin({
            patterns: [
            {from: "preview.png", to: "./siyuan-plugin-templater/"},
            {from: "icon.png", to: "./siyuan-plugin-templater/"},
            {from: "README*.md", to: "./siyuan-plugin-templater/"},
            {from: "plugin.json", to: "./siyuan-plugin-templater/"},
            {from: "src/i18n/", to: "./siyuan-plugin-templater/i18n/"},
            ],
        }));        
        plugins.push(new ZipPlugin({
            filename: "package.zip",
            algorithm: "gzip",
            include: [/siyuan-plugin-templater/],
            pathMapper: (assetPath) => {
                return assetPath.replace(/dist\/|siyuan-plugin-templater\//g, "");
            },
            path: path.resolve(__dirname)
        }));
    } else {
        plugins.push(new CopyPlugin({
            patterns: [
                {from: "src/i18n/", to: "./i18n/"},
            ],
        }));
    }
    return {
        mode: argv.mode || "development",
        watch: !isPro,
        devtool: isPro ? false : "eval",
        output: {
            filename: "[name].js",
            path: outputDir,
            libraryTarget: "commonjs2",
            library: {
                type: "commonjs2",
            },
        },
        externals: {
            siyuan: "siyuan",
        },
        entry,
        optimization: {
            minimize: true,
            minimizer: [
                new EsbuildPlugin(),
            ],
        },
        resolve: {
            extensions: [".ts", ".scss", ".js", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.ts(x?)$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        {
                            loader: "esbuild-loader",
                            options: {
                                target: "es6",
                            }
                        },
                    ],
                },
                {
                    test: /\.scss$/,
                    include: [path.resolve(__dirname, "src")],
                    use: [
                        MiniCssExtractPlugin.loader,
                        {
                            loader: "css-loader", // translates CSS into CommonJS
                        },
                        {
                            loader: "sass-loader", // compiles Sass to CSS
                        },
                    ],
                }
            ],
        },
        plugins,
    };
};
