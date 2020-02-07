const defaultPatterns = ['README.md'];

const create = options => {
    const patterns = options.patterns || defaultPatterns;
    const overwrite = options.overwrite !== false;
    const ignoreCase = options.ignoreCase !== false;

    const copy = async (package, dist, source) => {
        for (const pattern of patterns) {
            await source.copyAsync('.', dist.path(), {
                matching: pattern,
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
