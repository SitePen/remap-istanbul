/* jshint node: true */
/* global Promise */

var loadCoverage = require('../lib/loadCoverage');
var remap = require('../lib/remap');
var writeReport = require('../lib/writeReport');

module.exports = function (grunt) {
	grunt.registerMultiTask('remapIstanbul', function () {
		var done = this.async();
		var options = this.options();
		var p = [];
		this.files.forEach(function (file) {
			var coverage = remap(loadCoverage(file.src, {
				readJSON: grunt.readJSON,
				warn: grunt.fail.warn
			}, {
				readFile: grunt.readFile,
				readJSON: grunt.readJSON,
				warn: grunt.fail.warn
			}));

			if (file.type && file.dest) {
				p.push(writeReport(coverage, file.type, file.dest));
			}
			else {
				p = p.concat(Object.keys(options.reports).map(function (key) {
					return writeReport(coverage, key, options.reports[key]);
				}));
			}
		});

		Promise.all(p).then(function() {
			done();
		}, grunt.fail.fatal);
	});
};
