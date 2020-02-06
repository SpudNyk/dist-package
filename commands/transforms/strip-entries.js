const defaultKeys = ['scripts', 'devDependencies'];

const create = ({ keys = defaultKeys, invert = false }) => {
    const allowed = invert
        ? key => keys.includes(key)
        : key => !keys.includes(key);
    return async package => {
        const transformed = {};
        for (const [key, entry] of Object.entries(package)) {
            if (allowed(key)) {
                transformed[key] = entry;
            }
        }
        return transformed;
    };
};

module.exports = {
    __du_isTransform: true,
    enable: true,
    priority: 0,
    name: 'strip-entries',
    create
};
