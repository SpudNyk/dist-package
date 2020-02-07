const { merge } = require('merge-anything');
const { isPlainObject } = require('is-what');

const readOverride = async (path, source) => {
    const exists = await source.existsAsync(path);
    let maybeModule = false;
    if (!exists) {
        throw new Error(`${path} does not exist`);
    } else if (exists === 'dir') {
        const modpath = source.path(path, 'index.js');
        if ((await source.existsAsync(modpath)) === 'file') {
            maybeModule = true;
        } else {
            throw new Error(
                `Cannot read package overrides from directory ${path} - no index.js present`
            );
        }
    } else if (exists !== 'file') {
        throw new Error(`${path} is not a valid file or directory`);
    }

    if (maybeModule || path.endsWith('.js') || path.endsWith('.cjs')) {
        const mod = require(path);
        return mod.__esModule && mod.default ? mod.default : mod;
    } else {
        return source.readAsync(path, 'json');
    }
};

const overrideDefaults = [
    '.dist-package-override.json',
    '.dist-package-override.json'
];

const getDefaultOverrideFile = async source => {
    for (const name in overrideDefaults) {
        const path = source.path(name);
        if ((await source.existsAsync(path)) === 'file') {
            return path;
        }
    }
    return undefined;
};

const overrideNothing = async package => package;

const unpackSpec = (spec, { asMerge }) => {
    if (typeof spec === 'function') {
        return spec;
    }

    if (!isPlainObject(spec)) {
        console.warn(`A valid override spec was not given`);
        return overrideNothing;
    }

    if (spec.__isOverride && spec.spec) {
        // options will override spec file
        if (typeof asMerge === 'undefined') {
            asMerge = spec.asMerge === true;
        }
        spec = spec.override;
    }

    // passed in object just override
    if (asMerge) return package => merge(package, spec);

    return package => ({
        ...package,
        ...spec
    });
};

// create an override transform
const create = async ({ override, ...options }, source) => {
    if (!override) {
        const path = await getDefaultOverrideFile(source);
        override = path ? path : overrideNothing;
    }
    return unpackSpec(
        typeof override === 'string'
            ? readOverride(override, source)
            : override,
        options
    );
};

module.exports = {
    __du_isTransform: true,
    enabled: true,
    priority: 0,
    create
};
