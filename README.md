# remap-istanbul

[![Build Status](https://travis-ci.org/kitsonk/remap-istanbul.svg?branch=master)](https://travis-ci.org/kitsonk/remap-istanbul)

A package that provides the ability to remap [Istanbul](https://gotwarlost.github.io/istanbul/) code coverage information to its original source positions based on a JavaScript [Source Maps v3](https://docs.google.com/document/d/1U1RGAehQwRypUTovF1KRlpiOFze0b-_2gc6fAH0KY0k/edit#heading=h.djovrt4kdvga).

`remap-istanbul` requires NodeJS 0.12 or later (which includes any version of io.js).

## Usage

There are three main modules that constitute the **remap-istanbul** package:

 - **lib/loadCoverage** - does the basic loading of a Istanbul JSON coverage files.  It can "merge" several coverage files, for example if you are collecting remote coverage from other environments and combining it together.
 - **lib/remap** - does the remapping of the coverage information.  It iterates through all the files in the coverage information and looks for JavaScript Source Maps which it will then use to remap the coverage information to the original source.
 - **lib/writeReport** - a wrapper for the Istanbul report writers to output the any final coverage reports.

### Basic JavaScript

The main CommonJS module provided combines the modules above into a single API which basic usage can look like this:

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

The main modules are provided in AMD for usage (although they utilize `amdefine` to allow transparent loading by a CommonJS loader such as NodeJS's `require` - see blow).

#### `lib/loadCoverage`

The `lib/loadCoverage` module would be used something like this:

```js
require([ 'remap-istanbul/lib/loadCoverage' ], function (loadCoverage) {
	var coverage = loadCoverage('coverage-final.json');
	/* or if you have multiple files you want to merge */
	coverage = loadCoverage([ 'coverage-ie.json', 'coverage-chrome.json', 'coverage-firefox.json' ]);
});
```

The argument signature for `loadCoverage` is:

|Argument|Type|Description|
|--------|----|-----------|
|coverage|Array/string|Either an array of strings or a string representing the file path to the coverage file(s).|
|options|Object?|An object that allows providing alternative methods, mainly used for integration with other systems (e.g. Grunt)|
|*returns*|Object|A coverage object that is ready to be remapped|

The `options` argument can take the following optional properties:

|Property|Type|Default|Description|
|--------|----|-------|-----------|
|readJSON|Function|`JSON.parse(fs.readFileSync)`|A function that will synchronously read a file and return a POJO based on the JSON data in the file|
|warn|Function|`console.warn`|A function that logs warning messages|

#### `lib/remap`

Usage of the `lib/remap` module would look something like this:

```js
require([
	'remap-istanbul/lib/loadCoverage',
	'remap-istanbul/lib/remap'
], function (loadCoverage, remap) {
	var coverage = loadCoverage('coverage-final.json');
	var collector = remap(coverage); /* collector now contains the remapped coverage */
});
```

The argument signature for `remap` is:

|Argument|Type|Description|
|--------|----|-----------|
|coverage|Array/Object|Either an array of coverage objects or a single coverage object.|
|options|Object?|An object that allows providing alternative methods, mainly used for integration with other systems (e.g. Grunt)|
|*returns*|istanbul/lib/collector|An Istanbul coverage collector that is ready to be output|

The argument of `options` can contain the following properties:

|Property|Type|Default|Description|
|--------|----|-------|-----------|
|readFile|Function|`fs.readFileSync`|A function that will synchronously read a file|
|readJSON|Function|`JSON.parse(fs.readFileSync)`|A function that will synchronously read a file and return a POJO based on the JSON data in the file|
|warn|Function|`console.warn`|A function that logs warning messages|

#### `lib/writeReport`

The `lib/writeReport` module would be used something like this:

```js
require([
	'remap-istanbul/lib/loadCoverage',
	'remap-istanbul/lib/remap',
	'remap-istanbul/lib/writeReport'
], function (remap, writeReport) {
	var collector = remap(loadCoverage('coverage-final.json'));
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
var loadCoverage = require('remap-istanbul/lib/loadCoverage');
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

You can utilize this package as a [gulp](http://gulpjs.com) plugin.  There are two main ways it can be
used.  Just taking a coverage file, remapping and outputting it would look like this:

```js
var grunt = require('grunt');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

grunt.task('remap-istanbul', function () {
	return grunt.src('coverage-final.json')
		.pipe(remapIstanbul())
		.pipe(gulp.dest('coverage-remapped.json'));
});
```

Another way is to utilize the the plugin is to have the plugin write out the Istanbul reports directly.
This can be accomplished by passing a `reports` property in the options.  For example, to have the JSON
coverage report output in addition to the HTML coverage report, at task would look like this:

```js
var grunt = require('grunt');
var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

grunt.task('remap-istanbul', function () {
	return grunt.src('coverage-final.json')
		.pipe(remapIstanbul({
			reports: {
				'json': 'coverage.json',
				'html': 'html-report'
			}
		}));
});
```
