# hbsutil

`hbsutil` is a command line wrapper around [handlebars][1]


[1]: http://handlebarsjs.com

## Usage
```
  Usage: hbsutil [options] <template ...>

  Small command line utility for build-time processing of handlebars templates

  Options:

    -h, --help                 output usage information
    -V, --version              output the version number
    -f, --file <json_file>     Input file to read the data from. Can be specified multiple times, and files will be merged together in the order they appear on the command line, with later files overwriting duplicate fields of earlier files.
    -e, --env [fieldName]      Add environment variables under the given fieldName. Defaults to 'env' if no fieldName given
    -o, --opt <nameValuePair>  Add an extra value to the @root object, as a string. Specify as "name=value"
    -d, --dir <directory>      Directory to write the output file to. By default, will write to same directory as the input template
    -s, --strip [suffix]       If an input template file ends in the given suffix, the output file will have that suffix stripped off. For example, a suffix of 'hbs' would turn file.html.hbs into 'file.html'. Multiple entries can be specified, separated by commas. If this parameter is specified with no argument, will default to stripping off '.hbs'
    --force                    Normally if we calculate that an output file will overwrite the input file that generated it, we refuse to continue processing since this is almost certainly not what the user meant. Passing --force overrides this.
    -v, --verbose              Print extra information about what we're doing
    -q, --quiet                Only print errors. -v will override this if both are specified
```

## License

GNU GPL-3 - see LICENSE.md file for details.

## Author

Patrick Lavigne (https://github.com/PMLavigne)

