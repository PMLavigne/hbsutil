#! /usr/bin/env node
/* eslint-disable no-param-reassign */
'use strict';

var hbs         = require('handlebars');
var fs          = require('fs');
var program     = require('commander');
var log         = require('winston');
var _           = require('underscore');
var mkdirp      = require('mkdirp');
var path        = require('path');

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
            '-d, --dir <directory>',
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
            '--force',
            'Normally if we calculate that an output file will overwrite the input file that generated it, we refuse to ' +
            'continue processing since this is almost certainly not what the user meant. Passing --force overrides this.'
        )
        .option(
            '-v, --verbose',
            'Print extra information about what we\'re doing'
        )
        .option(
            '-q, --quiet',
            'Only print errors. -v will override this if both are specified'
        )
        .parse(process.argv);

    // Set up logging as soon as we can
    configureLogging();

    // Check to make sure we got args
    if(!program.args || !program.args.length) {
        log.error('At least one template file is required');
        program.help();
        process.exit(1);
    }

    // Set some programmatic defaults that commander doesn't handle - these are set to true when the user specifies a flag
    // without giving the optional value for the flag, so we need to set a default
    if (program.strip === true) {
        program.strip = ['.hbs'];
    }

    if(program.env === true) {
        program.env = 'env';
    }

    // Clean up program.dir just 'cuz
    if(program.dir) {
        var dirTrimmed = program.dir.trim();
        if(!dirTrimmed.length) {
            log.error('Invalid output directory specified: "' + program.dir + '"');
            program.help();
            process.exit(1);
        }

        // If path ends with a slash, trim it
        if(dirTrimmed[dirTrimmed.length-1] === path.sep) {
            dirTrimmed = dirTrimmed.substring(0, dirTrimmed.length-1);
        }

        program.dir = dirTrimmed;
    }
}

function configureLogging() {
    var logLevel = program.verbose ? 'debug' : program.quiet ? 'error' : 'info';

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

function canRead(path) {
    try {
        fs.accessSync(path, fs.constants.R_OK);
        return true;
    } catch (err) {
        return false;
    }
}


function parseTemplatePath(tplPath, stripFunc) {
    if(!(tplPath || '').trim()) {
        throw new Error('path is null or empty');
    }
    var inPath = path.parse(tplPath);

    if (!inPath) {
        throw new Error('path.parse() returned null');
    }

    var outDir = program.dir ? program.dir : inPath.dir,
        outFile = stripFunc ? stripFunc(inPath.base) : inPath.base;

    var pathInfo = {
        inDir: inPath.dir,
        inName: inPath.base,
        inPath: inPath.dir + path.sep + inPath.base,
        outDir: outDir,
        outName: outFile,
        outPath: outDir + path.sep + outFile
    };

    if(!canRead(pathInfo.inPath)) {
        throw new Error('Template "' + tplPath + '" doesn\'t exist or isn\'t accessible.');
    }

    if(!canRead(pathInfo.outDir)) {
        log.debug('Creating output directory: ' + pathInfo.outDir);
        mkdirp.sync(pathInfo.outDir);
    }

    if (pathInfo.inDir !== pathInfo.outDir || pathInfo.inName !== pathInfo.outName) {
        return pathInfo;
    }

    if (!program.force) {
        throw new Error('Template file "' + tplPath + '" will overwrite itself since its output path matches its ' +
                        'input path. If you\'re SURE you want to do this, use --force');
    }

    log.warn('Template file "' + tplPath + '" will overwrite itself since its output path matches its ' +
             'input. Continuing anyway since --force specified!');
    return pathInfo;
}

function getStripFunc() {
    if(!program.strip) {
        return null;
    }
    var regexStr = _.map(program.strip, function (suffix) {
        return suffix.replace(/[\-\[\]\/{}()*+?.\\\^$|]/g, '\\$&');
    }).join('|');

    var regex = new RegExp('(?:' + regexStr + ')$', 'i');
    log.debug('Using regex ' + regex + ' to strip template file suffix');
    return function(path) { return path.replace(regex, ''); };
}

function processTemplateList(data) {
    var stripFunc = getStripFunc();

    _.chain(program.args)
        .map(function(arg) {
            try {
                return parseTemplatePath(arg, stripFunc);
            } catch (err) {
                log.error('Failure while preprocessing template "' + arg + '"', err);
                process.exit(1);
            }
        })
        .each(function(pathInfo) {
            try {
                processTemplate(pathInfo, data);
            } catch (err) {
                log.error('Error while processing template ' + pathInfo.file, err);
                process.exit(1);
            }
        });
}

function processTemplate(pathInfo, data) {
    log.info(pathInfo.inPath + '\t⇨ ' + pathInfo.outPath);
    var templateText = fs.readFileSync(pathInfo.inPath).toString();
    log.debug(pathInfo.inName + '\t- Loaded');
    var template = hbs.compile(templateText);
    log.debug(pathInfo.inName  + '\t- Compiled');
    var processed = template(data);
    log.debug(pathInfo.inName + '\t- Processed');
    fs.writeFileSync(pathInfo.outPath, processed);
    log.debug(pathInfo.inName + '\t- Written');
}


parseOptions();
processTemplateList(compileData());

log.info('Done.');
process.exit(0);
