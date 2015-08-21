define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/remap',
	'../../../lib/writeReport'
], function (registerSuite, assert, remap, writeReport) {
	var coverage;

	registerSuite({
		name: 'remap-istanbul/lib/writeReport',

		setup: function () {
			coverage = remap({ sources: [ 'tests/unit/support/coverage.json' ] });
		},

		'coverage.json': function () {
			return writeReport(coverage, 'json', 'tmp/coverage-out.json');
		}
	});
});
