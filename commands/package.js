const jp = require('fs-jetpack');
const pathSep = require('path').sep;
const packageFile = 'package.json';

const transform = async (transformations, package, destination, source) => {
    let transformed = package;
    for (const transformation of transformations) {
        transformed = await transformation(transformed, destination, source);
    }
    return transformed;
};

const relPath = path => {
    const cwd = jp.path() + pathSep;
    if (path.startsWith(cwd)) {
        return './' + path.slice(cwd.length);
    }
    return path;
};

const preparePackage = async (sourceDir, destDir, transformations = []) => {
    const sourceFs = jp.cwd(sourceDir);
    const destFs = await jp.dirAsync(destDir);
    console.log(
        `transforming ${relPath(sourceFs.path(packageFile))} -> ${relPath(
            destFs.path(packageFile)
        )}`
    );
    const package = await sourceFs.readAsync(packageFile, 'json');
    const transformed = await transform(
        transformations,
        package,
        destFs,
        sourceFs
    );

    await destFs.writeAsync(packageFile, transformed, {
        atomic: true,
        jsonIndent: 2
    });
};

const main = async argv => {
    const config = await argv.config;
    const options = await config.args('package', argv);
    const { source, dist } = config.get('dirs');
    if (!source) {
        console.log('Unable to determine a valid source package');
        process.exitCode = 1;
        return;
    }
    if (source === dist) {
        console.log(`Source and dist cannot be the same: ${source}`);
        process.exitCode = 1;
        return;
    }

    console.log(`Updating package in ${dist} with ${source}`);
    const override = require('./transformations/override')();
    const tranformations = [override];
    if (options['fix-exports']) {
        tranformations.push(
            require('./transformations/export-default')()
        );
    }
    await preparePackage(source, dist, tranformations);
};

module.exports = {
    command: ['package [dist-dir] [source]', 'pack'],
    description:
        'copy package file for publishing stripping unnecessary attributes.',
    builder: yargs => {
        yargs
            .positional('source-dir', {
                alias: ['source'],
                description: 'The source package folder'
            })
            .positional('dist-dir', {
                alias: ['dist', 'destination'],
                description: 'The dist folder'
            })
            .option('fix-exports', {
                type: 'boolean',
                description:
                    'Fixes the default export for es6 transpiled modules by adding a wrapper into the package main entry.'
            });
    },
    handler: main
};
