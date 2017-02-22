#! /usr/bin/env node
/* eslint-disable no-param-reassign */


var hbs         = require('handlebars');
var fs          = require('mz/fs');
var program     = require('commander');
var packageJson = require('./package.json');

program
    .version(packageJson.version)
    .description(packageJson.description)
    .usage('[options] <template ...>')
    .option(
        '-f, --file <json_file>',
        'Input file to read the data from. Can be specified multiple times, and files will be ' +
        'merged together in the order they appear on the command line, with later files overwriting ' +
        'duplicate fields of earlier files.',
        function (val, memo) { memo.push(val); return memo; },
        []
    )
    .option(
        '-e, --env',
        'Add environment variables to the @root object (accessible via @root.env)'
    )
    .option(
        '-o, --opt <name> <value>',
        'Add an extra value to the @root object, as a string',
        function (name, value, obj) { obj[name] = value; return obj; },
        {}
    )
    .option(
        '-d, --output-directory <directory>',
        'Directory to write the output file to. By default, will write to same directory as the input template'
    )
    .option(
        '-s, --strip [suffix]',
        'If an input template file ends in the given suffix, the output file will have that suffix stripped off. ' +
        'For example, a suffix of \'hbs\' would turn file.html.hbs into \'file.html\'. Multiple entries can be specified, ' +
        'separated by commas. If this parameter is specified with no argument, will default to stripping off \'.hbs\'',
        function (val) { return val.split(','); },
        ['.hbs']
    )
    .option(
        '-v, --verbose',
        'Print extra information about what we\'re doing'
    )
    .parse(process.argv);

