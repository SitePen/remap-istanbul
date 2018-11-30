const fs = require('fs');
const path = require('path');
const main = require('../../../lib/main');

const registerSuite = intern.getPlugin('interface.object').registerSuite;
const assert = intern.getPlugin('chai').assert;
const sourceFilePath = path.join('tests', 'unit', 'support', 'basic.ts');

registerSuite('main', {
	'interface': function () {
		return main([ 'tests/unit/support/coverage.json' ], {
			'lcovonly': 'tmp/main.lcov.info',
			'json': 'tmp/main.json'
		}).then(function () {
			var lcovonly = fs.readFileSync('tmp/main.lcov.info', { encoding: 'utf8' });
			assert(lcovonly, 'should have returned content');
			assert.include(lcovonly, 'SF:' + sourceFilePath,
				'should have the mapped file name');
			var json = JSON.parse(fs.readFileSync('tmp/main.json', { encoding: 'utf8' }));
			assert(json, 'should have returned content');
			assert(json[sourceFilePath],
				'should have key named after mapped file');
		});
	},

	'string argument': function () {
		return main('tests/unit/support/coverage.json', {
			'json': 'tmp/main-string.json'
		}).then(function () {
			var json = JSON.parse(fs.readFileSync('tmp/main-string.json', { encoding: 'utf8' }));
			assert(json, 'should have returned content');
			assert(json[sourceFilePath],
				'should have key named after mapped file');
		});
	},

	'inline sources': function () {
		return main('tests/unit/support/coverage-inlinesource.json', {
			'html': 'tmp/html-report-main'
		}).then(function () {
			// Istanbul does not place supporting HTML files in the same directory structure for all OSes.  It is not
			// super important because the parent index.html is always in the destination directory.
			var reportExists = false;
			if (fs.existsSync('tmp/html-report-main/support/inlinesource.ts.html')) {
				reportExists = true;
			}
			else if (fs.existsSync('tmp/html-report-main/tests/unit/support/inlinesource.ts.html')) {
				reportExists = true;
			}

			assert(reportExists);
		});
	}
});
