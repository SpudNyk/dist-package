#!/usr/bin/env node
const yargs = require('yargs');
const jp = require('fs-jetpack');
const lines = require('./lib/lines');
const config = require('./lib/config');

yargs
    .option('config', {
        alias: 'c',
        description: lines(
            'path to a config file',
            `looks in parent directories for ${config.CONFIG_PROFILES.join(
                ','
            )}`,
            'combining their contents until inherit: false is encountered.',
            'additionally package.json files are looked for stopping inheritance if encountered'
        )
    })
    .option('source', {
        alias: ['s', 'src', 'package-dir'],
        defaultDescription: 'current directory or package directory if found',
        description: 'The source package directory.'
    })
    .option('dist', {
        alias: ['d', 'destination', 'o', 'output'],
        defaultDescription: 'dist',
        description: lines('The distribution folder', 'Where this script will output files')
    })
    .commandDir(jp.path(__dirname, 'commands'))
    .middleware(config.middleware).argv;
