const path = require('path');
const defaultPatterns = ['./README.*', './LICENSE'];
const defaultIgnorePaths = ['node_modules'];

const ignoreDir = subPath => '!./' + subPath.replace(path.sep, '/') + '/**/*';

const addIgnored = (patterns, source, dist) => {
    if (!patterns || patterns.length === 0) {
        return;
    }
    // include dist if needed
    const distPath = dist.path();
    const sourcePath = source.path();
    const ignores = [];
    if (distPath.startsWith(sourcePath + path.sep)) {
        ignores.push(ignoreDir(distPath.slice(sourcePath.length + 1)));
    }
    ignores.push(...defaultIgnorePaths.map(ignoreDir));
    return patterns.concat(ignores);
};

const create = options => {
    const patterns = options.patterns || defaultPatterns;
    const overwrite = options.overwrite !== false;
    const ignoreCase = options.ignoreCase !== false;
    // no patterns given don't do anything
    if (!patterns || patterns.length === 0) {
        return package => package;
    }
    const copy = async (package, dist, source) => {
        const matching = addIgnored(patterns, source, dist);
        if (matching && matching.length > 0) {
            await source.copyAsync('.', dist.path(), {
                matching,
                ignoreCase: ignoreCase,
                overwrite: overwrite
            });
        }
        return package;
    };
    return copy;
};

module.exports = {
    __du_isTransform: true,
    enabled: true,
    priority: 10,
    create
};
