const jp = require('fs-jetpack');
const pathSep = require('path').sep;

const main = async argv => {
    const config = await argv.config;
    // eslint-disable-next-line no-unused-vars
    const options = await config.args('clean', argv);
    const { dist } = config.get('dirs');
    const path = jp.path(dist);
    const cwd = jp.path();
    if (path === cwd || cwd.startsWith(path + pathSep)) {
        console.log(`Cannot remove the current directory`);
        process.exitCode = 1;
        return;
    }
    console.log(`Removing ${dist}`);
    await jp.removeAsync(dist);
};

module.exports = {
    command: 'clean [dist-dir]',
    description: 'cleans the given folder',
    builder: yargs => {
        yargs.positional('dist-dir', {
            alias: ['dist', 'destination'],
            description: 'The folder to clean'
        });
    },
    handler: main
};
