#! /usr/bin/env node
/* eslint-disable no-param-reassign */
"use strict";

var hbs         = require('handlebars');
var fs          = require('fs');
var program     = require('commander');
var log         = require('winston');
var _           = require('underscore');

var packageJson = require('./package.json');

function parseOptions() {
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
            '-e, --env [fieldName]',
            'Add environment variables under the given fieldName. Defaults to \'env\' if no fieldName given'
        )
        .option(
            '-o, --opt <nameValuePair>',
            'Add an extra value to the @root object, as a string. Specify as "name=value"',
            function (nameValuePair, obj) {
                var nameValSplit = /^([^=]+?)(?:=(.*))?$/.exec(nameValuePair);
                if(!nameValSplit || nameValSplit.length < 3) {
                    return obj;
                }
                obj[nameValSplit[1]] = nameValSplit[2] || null;
                return obj;
            },
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
        .option(
            '-q, --quiet',
            'Only print warnings and errors. -v will override this if both are specified'
        )
        .parse(process.argv);
}

function configureLogging() {
    var logLevel = program.verbose ? 'debug' : program.quiet ? 'warn' : 'info';

    log.configure({
        level: logLevel,
        transports: [
            new (log.transports.Console)({
                level: logLevel,
                colorize: false,
                prettyPrint: true,
                humanReadableUnhandledException: true,
                handleExceptions: true,
                stderrLevels: []
            })
        ]
    });
    log.cli();
    log.info(program.name() + ' v' + program.version());
    log.debug('Verbose output enabled');
}

function compileData() {
    var dataObj = {};

    if(program.file && program.file.length) {
        log.debug('Loading data files...');
        _.each(program.file, function(curFile) {
            log.debug('Loading file ' + curFile);
            try {
                var fileContents = fs.readFileSync(curFile);
                var fileData = JSON.parse(fileContents);
                if(fileData) {
                    _.extend(dataObj, fileData);
                }
            } catch (err) {
                log.error('Error loading file ' + curFile, err);
                process.exit(1);
            }
        });
    }

    if(program.env) {
        if(program.env === true) {
            program.env = 'env';
        }
        log.debug('Adding environment variables to data.' + program.env + '...');
        dataObj[program.env] = dataObj[program.env] || {};
        _.extend(dataObj[program.env], process.env);
    }

    if(program.opt) {
        log.debug('Adding custom command line options to data...');
        _.extend(dataObj, program.opt);
    }

    log.debug('Loaded data: ', dataObj);
    return dataObj;
}

function processTemplateList() {

}

function processTemplate(templatePath, data, outputPath) {

}


parseOptions();
configureLogging();
var data = compileData();

