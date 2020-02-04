const jp = require('fs-jetpack');
const pathSep = require('path').sep;
const packageFile = 'package.json'

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
}

const preparePackage = async (sourceDir, destDir, transformations = []) => {
    const sourceFs = jp.cwd(sourceDir);
    const destFs = await jp.dirAsync(destDir);
    console.log(`transforming ${relPath(sourceFs.path(packageFile))} -> ${relPath(destFs.path(packageFile))}`)
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

module.exports = preparePackage;
