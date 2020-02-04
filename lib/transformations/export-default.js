const jp = require('fs-jetpack');
const pathSep = require('path').sep;

const escape = value => value.replace(/[\\'"]/g, '\\$&');
const localPath = '.' + pathSep;
const modulePath = value =>
    escape(value.startsWith(localPath) ? value : localPath + value);

const transformer = () => async (package, destination) => {
    const main = package.main;
    if (!main) {
        console.log(`WARNING: no main entry in ${package.name || 'package'}`);
    }
    const exists = await destination.existsAsync(main);
    if (!exists) {
        console.log(`WARNING: module main entry point does not exist!`);
        return main;
    }
    const patch = '__export-default-main.js';
    if (await destination.existsAsync(patch)) {
        console.log(
            `WARNING: unable to patch default export ${patch} already exists`
        );
        return main;
    }
    const resources = jp.cwd(__dirname, 'resources');
    const script = await resources.readAsync('export-default-main.js');
    // write out wrapper
    await destination.writeAsync(
        patch,
        script.replace('$$package-main$$', modulePath(main))
    );
    return {
        ...package,
        main: patch
    };
};

module.exports = transformer;
