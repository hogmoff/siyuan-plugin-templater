const path = require("path");
const fs = require("fs");
const webpack = require("webpack");
const {EsbuildPlugin} = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CopyPlugin = require("copy-webpack-plugin");
const ZipPlugin = require("zip-webpack-plugin");

// Load configuration from local file if it exists, otherwise use template
let config;
try {
    config = require("./config.local.js");
    console.log("Using local configuration from config.local.js");
} catch (error) {
    try {
        config = require("./config.template.js");
        console.log("Using template configuration from config.template.js");
    } catch (innerError) {
        console.warn("No configuration file found. Using default values.");
        config = { targetDir: "" };
    }
}

// Copy Folder to destination
function copyFolderRecursiveSync(source, target) {
    if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
    }
    const files = fs.readdirSync(source);
    files.forEach(file => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.lstatSync(sourcePath).isDirectory()) {
            copyFolderRecursiveSync(sourcePath, targetPath);
        } else {
            fs.copyFileSync(sourcePath, targetPath);
        }
    });
}

module.exports = (env, argv) => {
    const isPro = argv.mode === "production";
    // Define your custom output directory here
    const outputDir = path.resolve(__dirname, "dist");
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

        // Copy Files to SiyuanTest Directory if targetDir is configured
        if (config.targetDir && config.targetDir.trim() !== "") {
            plugins.push({
                apply: (compiler) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    compiler.hooks.afterEmit.tap("CopyToSiyuanTest", (compilation) => {
                        const targetDir = config.targetDir;
                        const sourceDir = path.resolve(__dirname, "dist");

                        console.log(`Copying files from ${sourceDir} to ${targetDir}...`);

                        try {
                            if (!fs.existsSync(targetDir)) {
                                fs.mkdirSync(targetDir, { recursive: true });
                            }

                            copyFolderRecursiveSync(sourceDir, targetDir);

                            console.log("Files successfully copied!");
                        } catch (error) {
                            console.error("Error while copying files:", error);
                        }
                    });
                }
            });
        } else {
            console.log("No target directory configured for copying files. Skipping copy step.");
        }
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