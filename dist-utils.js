#!/usr/bin/env node
const yargs = require('yargs');
const jp = require('fs-jetpack');
const preparePackage = require('./lib/package');
const pathSep = require('path').sep;

const package = async argv => {
    const { source, destination } = argv;
    console.log(`Updating package in ${destination} with ${source}`);
    const override = require('./lib/transformations/override')();
    const tranformations = [override];
    if (argv['patch-export']) {
        tranformations.push(require('./lib/transformations/export-default')());
    }
    await preparePackage(source, destination, tranformations);
};

const clean = async argv => {
    const { destination } = argv;
    const path = jp.path(destination);
    const cwd = jp.path();
    if (path === cwd || cwd.startsWith(path + pathSep)) {
        console.log(`Cannot remove the current directory`);
        return;
    }
    console.log(`Removing ${destination}`);
    await jp.removeAsync(destination);
};

yargs
    .command(
        ['package <source> <destination>', 'pack'],
        'copy package file for publishing stripping unnecessary attributes.',
        yargs => {
            yargs
                .positional('source', {
                    description: 'The source package folder'
                })
                .positional('destination', {
                    description: 'The destination package folder'
                })
                .option('patch-export', {
                    type: 'boolean',
                    default: true,
                    description:
                        'Patch module entry common js default exports (for transpiled es modules)'
                });
        },
        package
    )
    .command('clean <destination>', 'clean the given folder', () => {}, clean)
    .argv;
