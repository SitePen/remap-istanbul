/* jshint node:true */
/* global Promise */
var remap = require('./lib/remap');
var writeReport = require('./lib/writeReport');

module.exports = function (sources, reports) {
	var collector = remap({ sources: sources });

	var p = Object.keys(reports).map(function (reportType) {
		return writeReport(collector, reportType, reports[reportType]);
	});
	return Promise.all(p);
};
module.exports.remap = remap;
module.exports.writeReport = writeReport;
