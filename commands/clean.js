const jp = require('fs-jetpack');
const path = require('path');
const { cwdSubPath } = require('../lib/paths');

const main = async argv => {
    const config = await argv.config;
    const { dist } = config.get('dirs');
    const distPath = jp.path(dist);
    const cwd = jp.path();
    if (path === cwd || cwd.startsWith(distPath + path.sep)) {
        console.log(`Cannot remove the current directory`);
        process.exitCode = 1;
        return;
    }
    console.log(`Removing ${cwdSubPath(dist)}`);
    await jp.removeAsync(dist);
};

module.exports = {
    command: 'clean',
    description: 'removes the dist directory',
    handler: main
};
