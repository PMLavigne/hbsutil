#! /usr/bin/env node --harmony
/* eslint-disable no-param-reassign */

import hbs from 'handlebars';
import fs from 'mz/fs';
import program from 'commander';
import packageJson from '../package.json';

program.version(packageJson.version)
    .description('Handlebars wrapper script for templating during build')
    .arguments('<template...>')
    .option(
        '-f, --file <json_file>',
        'An input file to read the data from. Can be specified multiple times, and files will be ' +
        'merged together in the order they appear on the command line, with later files overwriting ' +
        'duplicate fields of earlier files.',
        (val, memo) => { memo.push(val); return memo; },
        []
    )
    .option(
        '-e, --env',
        'Add environment variables to the @root object (accessible via @root.env)'
    )
    .option(
        '-o, --option <name> <value>',
        'Add an extra value to the @root object, as a string',
        (name, value, obj) => { obj[name] = value; return obj; },
        {}
    )
    .option(
        '-d, --output-directory <directory>',
        'Directory to write the output file to. By default, will write to same directory as the input template'
    )
    .option(
        '-s, --strip [suffix]',
        'If an input template file ends in the given suffix, the output file will have that suffix stripped off. ' +
        'For example, a suffix of \'hbs\' would turn file.html.hbs into \'file.html\'. This can be specified multiple' +
        'times. If this parameter is specified with no argument, will default to stripping off \'.hbs\'',
        (val, memo) => { memo.push(val); return memo; },
        []
    )
    .option(
        '-v, --verbose',
        'Print extra information about what we\'re doing'
    )
    .parse(process.argv);

