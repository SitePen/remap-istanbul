/* jshint node: true */
/*jshint -W079 */
if (typeof define !== 'function') { /* istanbul ignore next */ var define = require('amdefine')(module); }
define([
	'require',
	'exports',
	'./node!istanbul/index'
], function (require) {
	/* global Promise */

	var istanbulReportTypes = {
		'clover': 'file',
		'cobertura': 'file',
		'html': 'directory',
		'json-summary': 'file',
		'json': 'file',
		'lcovonly': 'file',
		'teamcity': 'file',
		'text-lcov': 'console',
		'text-summary': 'file',
		'text': 'file'
	};

	/**
	 * Generates an Instanbul Coverage report based on the information passed.
	 * @param  {istanbul/lib/collector} collector  An instance of an coverage
	 *                                             collector
	 * @param  {string}          reportType    The name of the report type to
	 *                                         generate
	 * @param  {string|function} dest          The filename or outputting
	 *                                         function to use for generating
	 *                                         the report
	 * @return {Promise}                       A promise that resolves when the
	 *                                         report is complete.
	 */
	return function writeReport(collector, reportType, dest) {
		return new Promise(function (resolve, reject) {
			if (!(reportType in istanbulReportTypes)) {
				reject(new SyntaxError('Unrecognized report type of "' + reportType + '".'));
				return;
			}
			require([ './node!istanbul/lib/report/' + reportType ], function (Reporter){
				var options = {};
				switch (istanbulReportTypes[reportType]) {
				case 'file':
					options.file = dest;
					break;
				case 'directory':
					options.dir = dest;
					break;
				case 'console':
					options.log = dest || console.log;
					break;
				}
				var reporter = new Reporter(options);
				resolve(reporter.writeReport(collector, true));
			});
		});
	};
});
