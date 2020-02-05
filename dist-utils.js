#!/usr/bin/env node
const yargs = require('yargs');
const jp = require('fs-jetpack');
const config = require('./lib/config');

yargs
    .option('config', {
        alias: 'c',
        description: 'path to a config file',
        default: null,
        coerce: arg => {
            return config.init(arg);
        }
    })
    .commandDir(jp.path(__dirname, 'commands')).argv;
