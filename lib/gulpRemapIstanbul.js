/* jshint node: true */
/*jshint -W079 */
if (typeof define !== 'function') { /* istanbul ignore next */ var define = require('amdefine')(module); }
define([
	'require',
	'exports',
	'./remap',
	'./writeReport',
	'./node!gulp-util',
	'./node!through2'
], function (require, exports, remap, writeReport, gutil, through) {
	/* global Promise */
	var PluginError = gutil.PluginError;

	return function (opts) {
		opts = opts || {};
		return through.obj(function (file, enc, cb) {
			var p = [];
			opts.warn = function (message) {
				return cb(new PluginError('remap-istanbul', message));
			};

			if (file.isNull()) {
				return cb(null, file);
			}

			if (file.isStream()) {
				return cb(new PluginError('remap-istanbul', 'Streaming not supported'));
			}

			var collector = remap(JSON.parse(file.contents.toString('utf8')), opts);

			if (opts.reports) {
				for (var key in opts.reports) {
					p.push(writeReport(collector, key, opts.reports[key]));
				}
			}

			file.contents = new Buffer(JSON.stringify(collector.getFinalCoverage()));

			Promise.all(p).then(function () {
				cb(null, file);
			});
		});
	};
});
