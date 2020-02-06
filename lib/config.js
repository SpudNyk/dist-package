const jp = require('fs-jetpack');
const { merge } = require('merge-anything');
const clone = require('copy-anything');
const path = require('path');

const CONFIG_PROFILES = ['.dist-package.rc', '.dist-package.json'];
module.exports.CONFIG_PROFILES = CONFIG_PROFILES;

const PACKAGE_FILE = 'package.json';
const PACKAGE_KEY = 'dist-utils';
module.exports.PACKAGE_KEY = PACKAGE_KEY;

const getDefaults = () => ({
    dirs: {
        source: process.cwd(),
        dist: path.resolve('dist')
    }
});
class Config {
    constructor(config) {
        this.root = clone(merge(getDefaults(), config));
    }

    update(obj) {
        return Promise.all(
            Object.entries(obj).map(([section, value]) =>
                this.set(section, value)
            )
        ).then(() => undefined);
    }

    set(section, config) {
        return (this.root[section] = merge(this.root[section], config));
    }

    get(section, override) {
        const result = this.root[section];
        return clone(override !== undefined ? merge(result, override) : result);
    }
}

const getDir = async directory => {
    const exists = await jp.existsAsync(path.resolve(directory));
    if (!exists) {
        return undefined;
    }
    return exists === 'dir' ? directory : path.dirname(directory);
};

const walkUp = async (directory, fn) => {
    let current = await getDir(directory);
    if (!current) {
        throw new Error(`${directory} cannot be resolved to a valid directory`);
    }
    const { root } = path.parse(current);

    while (current !== root) {
        if ((await fn(current)) === false) {
            return;
        }
        current = path.dirname(current);
    }

    // handle root folder
    await fn(current);
};

const readJson = file => jp.readAsync(file, 'json');

// packages act as root
const packageDefaults = { inherit: false };
const readPackageFile = async (package, defaults = packageDefaults) => {
    const json = await readJson(package);
    const config = json[PACKAGE_KEY];
    if (config) {
        return merge(defaults, config);
    }
    return;
};

const fileDefaults = { inherit: true };
const readConfigFile = async (config, defaults = fileDefaults) => {
    const json = await readJson(config);
    return merge(defaults, json);
};

const directoryConfig = async (dir, file, package) => {
    let config = !file ? {} : await readConfigFile(path.resolve(dir, file));

    // we only ever read from one package
    if (config.__hasPackage === true) return config;

    if (config.inherit !== false && package) {
        const packageConfig = await readPackageFile(path.resolve(dir, package));
        if (packageConfig) {
            config = merge(packageConfig, config);
        }
    }

    // implicitly set a valid package directory as source if it wasn't defined
    if (package) {
        config.__hasPackage = true;
        if (!(config.dirs && config.dirs.source)) {
            config = merge(config, { dirs: { source: dir } });
        }
    }
    return config;
};

// walk up the folder hierarchy from the start merging configs
// if a config has more precedence
const readDirectories = async (startDir, baseConfig) => {
    let config = baseConfig || {};
    await walkUp(startDir || '', async dir => {
        const [configs, package] = await Promise.all([
            Promise.all(
                CONFIG_PROFILES.map(file =>
                    jp.existsAsync(path.resolve(dir, file))
                )
            ),
            jp.existsAsync(path.resolve(dir, PACKAGE_FILE))
        ]);
        // use the first one that is a file
        const index = configs.indexOf('file');
        const file = index < 0 ? undefined : CONFIG_PROFILES[index];

        // parent configs are a base for child configs
        // so we merge the current config on top of the new one
        config = merge(
            await directoryConfig(
                dir,
                file,
                package === 'file' ? PACKAGE_FILE : undefined
            ),
            config
        );

        return config.inherit !== false;
    });
    return clone(config);
};

// read configuration from arguments
const readArgs = async args => {
    // configuration file arguments do not inherit by default
    let config = args.config
        ? merge({ inherit: false }, await readConfigFile(args.config))
        : {};

    // overwrite source if provided
    if (args.source && (await jp.existsAsync(args.source)) === 'file') {
        config.dirs = merge(config.dirs, {
            source: path.resolve(args.source)
        });
    }

    const source = (config.dirs && config.dirs.source) || process.cwd();

    // overwrite dist if provided
    if (args.dist) {
        config.dirs = merge(config.dirs, {
            dist: path.resolve(source, args.dist)
        });
    }
    return config;
};

const readConfig = async args => {
    // the base config will be built from the arguments
    const config = readArgs(args);
    const { dirs = {} } = config;
    return await readDirectories(
        dirs.source || process.cwd(),
        await readArgs(args)
    );
};

const middleware = async args => {
    args.config = new Config(await readConfig(args));
};

module.exports.middleware = middleware;
