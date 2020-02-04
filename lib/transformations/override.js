const jp = require('fs-jetpack');
const { isPlainObject } = require('is-what');

const overrideDefault = {
    scripts: undefined,
    devDependencies: undefined
};

// create an override transform
const transformer = (override = overrideDefault) => async package => {
    if (override && typeof override === 'string') {
        try {
            override = await jp.readAsync(override, 'json');
        } catch (e) {
            throw new Error(`${override} is not a valid file`);
        }
    }
    if (isPlainObject(override)) {
        return {
            ...package,
            ...override
        };
    } else {
        console.log(`Not plain ${JSON.stringify(override)}`)
    }
    return package;
};

module.exports = transformer;
