# remap-istanbul

[![Build Status](https://travis-ci.org/kitsonk/remap-istanbul.svg?branch=master)](https://travis-ci.org/kitsonk/remap-istanbul)

A package that provides the ability to remap [Istanbul](https://gotwarlost.github.io/istanbul/) code coverage information to its original source positions based on a JavaScript [Source Maps v3](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.djovrt4kdvga).

`remap-istanbul` requires NodeJS 0.12 or later (which includes any version of io.js).

## Usage

There are two main modules, there is the `lib/remap` module and the `lib/writeReport` module.  The first one
returns a function that provides the ability to remap the "native" `coverage.json` produced by Istanbul.  It
will read the file, analyse the files looking for source maps and then go through a process of remapping the
source maps back to the original file locations.

The `lib/writeReport` is a wrapper module for generating Istanbul reports, being passed an instance of a
coverage collector.

### Basic JavaScript

The main CommonJS module provided combines the two main modules into a single API which basic usage can look like this:

```js
var remapIstanbul = require('remap-istanbul');
remapIstanbul('coverage-final.json', {
	'json': 'coverage-final.json'
});
```

This would take the coverage file provided.  The function accepts the following arguments:

|Argument|Type|Description|
|--------|----|-----------|
|sources|Array, string|Either an array of strings or a string the represent the JSON Istanbul files to be remapped|
|reports|Object|A hash of reports, where the keys are the Istanbul report types and the values are the destination for the report|
|*returns*|Promise|A promise that is resolved when all the reports are written|

### AMD

The two main modules are provided in AMD for usage.  The `lib/remap` module would be used something like this:

```js
require([ 'remap-istanbul/lib/remap' ], function (remap) {
	var collector = remap({
		sources: [ 'coverage-final.json' ]
	}); /* collector now contains the remapped coverage */
});
```

Remap takes a single argument of `options` which can contain the following properties:

|Property|Type|Default|Description|
|--------|----|-------|-----------|
|sources|Array|*required*|An array of source JSON coverage files that need to be remapped|
|readFile|Function|`fs.readFileSync`|A function that will synchronously read a file|
|readJSON|Function|`JSON.parse(fs.readFileSync)`|A function that will synchronously read a file and return a POJO based on the JSON data in the file|
|warn|Function|`console.warn`|A function that logs warning messages|

The `lib/writeReport` module would be used something like this:

```js
require([
	'remap-istanbul/lib/remap',
	'remap-istanbul/lib/writeReport'
], function (remap, writeReport) {
	var collector = remap({
		sources: [ 'coverage-final.json' ]
	});
	writeReport(collector, 'json', 'coverage-final.json').then(function () {
		/* do something else now */
	});
});
```

The `writeReport` function can take the following arguments:

|Argument|Type|Description|
|--------|----|-----------|
|collector|istanbul/lib/collector|This is an Instabul coverage collector (usually returned from `remap` which is to be written out in a report)|
|reportType|string|The type of the report. Valid values are: `clover`, `cobertura`, `html`, `json-summary`, `json`, `file`, `lcovonly`, `teamcity`, `text-lcov`, `text-summary` or `text`|
|dest|string, Function|The destination file, directory or console logging function that is the destination of the report. Only `text-lcov` takes the logging function and will default to `console.log` if no value is passed.|
|*returns*|Promise|A promise that is resolved when the report is written.|

### CommonJS

If you are not using an AMD loader, that is not a problem for consuming the modules.  They also can be loaded in a
CommonJS environment:

```js
var remap = require('remap-istanbul/lib/remap');
var writeReport = require('remap-istanbul/lib/writeReport');
```

### Grunt Task

You can utilize this package as a [Grunt](http://gruntjs.com) task.  After installing it as a package, you need to add the following to your `Gruntfile.js`:

```js
grunt.loadNpmTasks('remap-istanbul');
```

The task is a multi-target task and a basic configuration for the task would look something like this:

```js
grunt.initConfig({
	remapIstanbul: {
		build: {
			src: 'coverage-final.json',
			options: {
				reports: {
					'lcovhtml': 'html-report',
					'json': 'coverage-final.json'
				}
			}
		}
	}
});
```

This would take in `coverage-final.json`, remap it and then output the Istanbul HTML report to `html-report`
and overwrite the original `coverage-final.json`.

The task also recognizes an abbreviated version of configuration:

```js
grunt.initConfig({
	remapIstanbul: {
		build: {
			files: [ {
				src: 'coverage.json',
				dest: 'tmp/coverage.json',
				type: 'json'
			} ]
		}
	}
});
```

### Gulp Plugin

**TODO**
