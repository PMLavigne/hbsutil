#! /usr/bin/env node
/* eslint-disable no-param-reassign */
"use strict";

var hbs         = require('handlebars');
var fs          = require('fs');
var program     = require('commander');
var log         = require('winston');
var _           = require('underscore');
var mkdirp      = require('mkdirp');

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
            function (val) { return val.split(','); }
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
    return dataObj;
}

function processTemplateList(data) {
    var stripFunc = function(path) { return path; };

    if(program.strip) {
        if (program.strip === true) {
            program.strip = ['.hbs']
        }
        var regexStr = _.map(program.strip, function (suffix) {
            return suffix.replace(/[\-\[\]\/{}()*+?.\\\^$|]/g, "\\$&");
        }).join('|');

        var regex = new RegExp('^(?:.*/)?([^/]+?)(?:' + regexStr + ')?$', 'i');
        log.debug('Using regex ' + regex + ' to clean output path');
        stripFunc = function(path) { return path.replace(regex, '$1'); };
    }

    var templates = _.map(program.args, function(arg) {
        arg = arg.trim();

        var outputFile = stripFunc(arg);
        var outputPath;
        if(program.outputDirectory) {
            outputPath = program.outputDirectory + '/';
        } else {
            outputPath = arg.replace(/^(.*\/)[^\/]+$/, '$1');
        }

        try {
            return {
                file: arg,
                outputPath: outputPath,
                outputFile: outputFile,
                contents: fs.readFileSync(arg)
            };
        } catch (err) {
            log.error('Error reading template file ' + arg, err);
            process.exit(2);
        }
    });

    _.each(templates, function(template) {
        processTemplate(template, data);
    });
}

function processTemplate(template, data) {
    log.info(template.file + ' -> ' + template.outputPath + template.outputFile);
    try {
        mkdirp.sync(template.outputPath);
        fs.writeFileSync(template.outputPath + template.outputFile, hbs.compile(template.contents.toString())(data));
    } catch (err) {
        log.error('Error processing template ' + template.file, err);
        process.exit(3);
    }
}


parseOptions();
configureLogging();
processTemplateList(compileData());

log.info('Done.');
process.exit(0);
