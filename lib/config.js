const jp = require('fs-jetpack');
const { isPlainObject } = require('is-what');

const isPackageDir = async folder => {
    if (!folder) return false;
    const wd = folder.cwd ? folder : jp.cwd(folder);
    if ((await wd.existsAsync('package.json')) === 'file') {
        return true;
    }
    return false;
};

const hasConfigFile = async folder => {
    if (!folder) return false;
    const wd = folder.cwd ? folder : jp.cwd(folder);
    if ((await wd.existsAsync('.dist-utils.json')) === 'file') {
        return true;
    }
    return false;
};

const findParentDir = async (start, matcher) => {
    let cwd = start;
    let lastPath = '';
    while (!(await matcher(cwd))) {
        cwd = cwd.cwd('..');
        if (lastPath === cwd.path()) {
            // didn't change must be root
            return undefined;
        }
        lastPath = cwd.path();
    }
    return cwd;
};

const defaults = {
    dirs: {
        dist: jp.path('dist')
    }
};

const configFile = '.dist-utils.json';
class Config {
    constructor() {
        this.root = {
            ...defaults
        };
    }

    async init(file) {
        this.root = {
            ...defaults
        };
        // initial configuration
        if (!file) {
            await this.scanForSource(jp.path());
            const { source } = this.get('dirs');
            await this.scanForConfig(source || jp.path());
            return this;
        }

        if ((await jp.existsAsync(file)) !== 'file') {
            throw new `${file} is not a file`();
        }
        try {
            const json = await this.readConfig(file, 'json');
            this.file = file;
            await this.update(json);
        } catch (e) {
            throw new `${file} is not a file`();
        }
        return this;
    }

    async scanForSource(hint) {
        await this.set('dirs', {
            source: null
        });
        let dir = await findParentDir(hint ? jp.cwd(hint) : jp, isPackageDir);
        if (dir) {
            await this.set('dirs', {
                source: dir.path()
            });
        }
    }

    async scanForConfig(hint) {
        // look for package directory and start looking for a .dist-utils.json
        const dir = await findParentDir(
            hint ? jp.cwd(hint) : jp,
            hasConfigFile
        );
        if (dir) {
            await this.readConfig(dir.path(configFile));
        }
        return true;
    }

    async readConfig(file) {
        const json = await jp.readAsync(file, 'json');
        return this.update(json);
    }

    update(obj) {
        return Promise.all(
            Object.entries(obj).map(([section, value]) =>
                this.set(section, value)
            )
        ).then(() => undefined);
    }

    async args(command, args) {
        if (!this.file && args['source-dir']) {
            // not configured from file so scan using source
            this.root = {};
            // scan for file
            await this.scanForSource(jp.path(args['source-dir']));
            const { source } = this.get('dirs');
            await this.scanForConfig(source || jp.path());
        }
        if (args['dist-dir']) {
            await this.set('dirs', {
                dist: jp.path(args['dist-dir'])
            });
        }
        return this.set(command, args);
    }

    preparePath(config, name) {
        const path = config[name];
        if (path) {
            config[name] = jp.path(path);
            if (name === 'dist') {
                console.trace(`updating ${name} - ${path}`);
            }
        }
    }

    async prepare(section, config) {
        if (section === 'dirs') {
            this.preparePath(config, 'dist');
            this.preparePath(config, 'source');
        }
        return config;
    }

    async set(section, config) {
        if (isPlainObject(config)) {
            await this.prepare(section, config);
            const current = this.root[section];
            this.root[section] = {
                ...current,
                ...config
            };
        } else {
            this.root[section] = config;
        }

        return this.root[section];
    }

    get(section) {
        return this.root[section];
    }
}

const config = new Config();

module.exports.init = config.init.bind(config);
