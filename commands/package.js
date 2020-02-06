const jp = require('fs-jetpack');
const lines = require('../lib/lines');
const table = require('../lib/table');
const path = require('path');
const pathSep = require('path').sep;

// default transforms location
const TRANSFORMS_DIR = './transforms';
const PACKAGE_FILENAME = 'package.json';

const relPath = path => {
    const cwd = jp.path() + pathSep;
    if (path.startsWith(cwd)) {
        return './' + path.slice(cwd.length);
    }
    return path;
};

const getName = entry => path.parse(entry.toLowerCase()).name;

const getModule = (name, path) => {
    try {
        const mod = require(path);
        if (mod.__du_isTransform) {
            mod.name = name;
            mod.enabled = mod.enabled !== false;
            mod.description = mod.description || '';
            mod.priority = mod.priority === undefined ? 0 : mod.priority;
            return mod;
        }
    } catch (e) {
        console.warn(`Unable to read ${path}`);
    }
    return undefined;
};

const getTransformModules = async (paths, filter) => {
    const seen = {};
    const modules = [];
    for (const path of paths) {
        const dir = jp.cwd(path);
        const list = await dir.listAsync();
        if (list) {
            const items = await Promise.all(
                list.map(async entry => {
                    const name = getName(entry);
                    if (seen[name] || !filter(name)) {
                        seen[name] = true;
                        return undefined;
                    }
                    let details = undefined;
                    if (
                        entry.endsWith('.js') &&
                        (await dir.existsAsync(entry)) === 'file'
                    ) {
                        details = getModule(name, dir.path(entry));
                    } else if (
                        await jp.existsAsync(dir.path(entry, 'index.js'))
                    ) {
                        details = getModule(name, dir.path(entry, 'index.js'));
                    }
                    if (details) {
                        seen[name] = true;
                    }
                    return details;
                })
            );
            modules.push(...items.filter(Boolean));
        }
    }
    modules.sort((m1, m2) => {
        const compare = m1.priority - m2.priority;
        if (compare !== 0) return compare;
        return m1.name < m2.name ? -1 : m1 > m2.name ? 1 : 0;
    });
    return modules;
};

// this filters even reading the modules
const transformsFilter = ({ include, exclude }) => {
    // we first process include - then exclude
    if (include && exclude) {
        return name => include.includes(name) && !exclude.includes(name);
    } else if (include) {
        return name => include.includes(name);
    } else if (exclude) {
        return name => !exclude.includes(name);
    }
    return () => true;
};

const listTransforms = async ({ paths, include, exclude, show = [] }) => {
    const modules = await getTransformModules(paths, () => true);

    const status = (name, enabled) => {
        const included = include ? include.includes(name) : null;
        const excluded = exclude ? exclude.includes(name) : null;
        let active = enabled;
        let reason = 'default state';
        if (included != null) {
            active = active && included;
            reason = `${included ? '' : 'not '} in include`;
        }
        if (excluded != null) {
            active = active && !excluded;
            reason = `${excluded ? '' : 'not '} in exclude`;
        }
        return [active, included, excluded, reason];
    };

    console.log('Available Modules:');
    const showPriority = show.includes('priority') && {
        text: 'priority'
    };
    const showReason = show.includes('reason') || show.includes('why');
    const showDescription =
        show.includes('desc') || show.includes('description');

    const list = table({
        header: {
            padding: [0, 1, 0, 0]
        },
        data: {
            padding: [0, 2, 0, 1]
        }
    });
    list.column(
        {
            title: 'name'
        },
        {
            title: 'enabled'
        },
        {
            title: 'priority',
            align: 'right',
            display: showPriority
        },
        {
            title: 'default',
            display: showReason
        },
        {
            title: 'reason',
            display: showReason
        },
        {
            title: 'description',
            display: showDescription
        }
    );

    for (const { name, description, enabled, priority } of modules) {
        const [active, , , reason] = status(name, enabled);
        list.data(name, active, priority, enabled, reason, description);
    }
    console.log(list.toString());
};

const runTransforms = async (transformations, package, destination, source) => {
    let transformed = package;
    for (const transformation of transformations) {
        transformed = await transformation(transformed, destination, source);
    }
    return transformed;
};

const prepareTransforms = async (options, source, dist) => {
    const modules = await getTransformModules(
        options.paths,
        transformsFilter(options)
    );
    const { include, enable } = options;
    const transformsOpts = options.transforms || {};
    const transforms = [];

    const isEnabled = (mod, modOpts) => {
        // defined individual options win
        if (modOpts && typeof modOpts.enabled === 'boolean') {
            return modOpts.enabled;
        }
        const name = mod.name;
        if (
            (enable && enable.includes(name)) ||
            (include && include.includes(name))
        ) {
            return true;
        }
        return mod.enabled;
    };

    for (const mod of modules) {
        const modOpts = transformsOpts[mod.name] || {};
        if (isEnabled(mod, modOpts)) {
            transforms.push(await mod.create(modOpts, source, dist));
        }
    }
    return transforms;
};

const preparePackage = async (sourceFs, distFs, transforms = []) => {
    console.log(
        `transforming ${relPath(sourceFs.path(PACKAGE_FILENAME))} -> ${relPath(
            distFs.path(PACKAGE_FILENAME)
        )}`
    );
    const package = await sourceFs.readAsync(PACKAGE_FILENAME, 'json');
    const transformed = await runTransforms(
        transforms,
        package,
        distFs,
        sourceFs
    );

    await distFs.writeAsync(PACKAGE_FILENAME, transformed, {
        atomic: true,
        jsonIndent: 2
    });
};

const applyArgs = (options, argv, ...names) => {
    for (const name of names) {
        const arg = argv[name];
        if (arg) {
            options[argv] = arg;
        }
    }
};
// get my options
const getOptions = (argv, options) => {
    const basePaths = [path.resolve(__dirname, TRANSFORMS_DIR)];
    options.paths = options.paths ? basePaths.concat(options.paths) : basePaths;
    applyArgs(options, argv, 'include', 'exclude');
    return options;
};

const main = async argv => {
    const config = argv.config;
    const { source, dist } = config.get('dirs');
    const options = await getOptions(argv, config.get('package', {}), source);
    if (argv.list) {
        return listTransforms({
            show: argv.show || [],
            ...options
        });
    }
    const sourceFs = jp.cwd(source);
    // ensure dist exists
    const distFs = await jp.dirAsync(dist);
    const transforms = await prepareTransforms(options, sourceFs, distFs);
    console.log(`Preparing ${relPath(source)} into ${relPath(dist)}`);
    await preparePackage(sourceFs, distFs, transforms);
    console.log(`Preperations complete`);
    console.log(
        `Don't forget to change to ${relPath(dist)} before publishing.`
    );
};

module.exports = {
    command: ['package', 'pack', '*'],
    description: lines(
        'copies package file to dist dir to prepare for publishing.',
        'While copying transforms are applied to the package',
        'Use flag --list to see the list of transforms'
    ),
    builder: yargs => {
        yargs
            .option('enable', {
                array: true,
                type: 'string',
                description: lines(
                    'A list of transforms to enable.',
                    'Transforms in this list will be enabled.'
                )
            })
            .option('include', {
                array: true,
                type: 'string',
                description: lines(
                    'list of transforms to include.',
                    'Only transforms named in this list will run'
                )
            })
            .option('exclude', {
                array: true,
                type: 'string',
                description: lines(
                    'list of transforms to exclude.',
                    'Transforms named in this list will be prevented from running.'
                )
            })
            .option('list', {
                boolean: true,
                description: 'displays all the known transforms.'
            })
            .option('show', {
                alias: ['list-opts'],
                array: true,
                choices: ['priority', 'reason', 'why', 'desc', 'description'],
                description: 'displays all the known transforms.'
            });
    },
    handler: main
};
