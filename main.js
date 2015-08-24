/* jshint node:true */
/* global Promise */
var remap = require('./lib/remap');
var writeReport = require('./lib/writeReport');

/**
 * The basic API for utilising remap-istanbul
 * @param  {Array|string} sources The sources that could be consumed and remapped.
 *                                For muliple sources to be combined together, provide
 *                                an array of strings.
 * @param  {Object} reports An object where each key is the report type required and the value
 *                          is the destination for the report.
 * @return {Promise}         A promise that will resolve when all the reports are written.
 */
module.exports = function (sources, reports) {
	if (typeof sources === 'string') {
		sources = [ sources ];
	}
	var collector = remap({ sources: sources });

	var p = Object.keys(reports).map(function (reportType) {
		return writeReport(collector, reportType, reports[reportType]);
	});
	return Promise.all(p);
};
module.exports.remap = remap;
module.exports.writeReport = writeReport;
