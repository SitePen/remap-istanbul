const fs = require('fs');
const path = require('path');
const MemoryStore = require('istanbul/lib/store/memory');
const loadCoverage = require('../../../src/loadCoverage');
const remap = require('../../../src/remap');
const writeReport = require('../../../src/writeReport');

const registerSuite = intern.getPlugin('interface.object').registerSuite;
const assert = intern.getPlugin('chai').assert;
let coverage;
let consoleLog;
let consoleOutput = [];

function mockLog() {
	consoleOutput.push(arguments);
}

registerSuite('remap-istanbul/lib/writeReport', {
	before: function () {
		coverage = remap(loadCoverage('tests/unit/support/coverage.json'));
	},

	tests: {
		'invalid': function () {
			var dfd = this.async();
			writeReport(coverage, 'foo', {}, 'bar').then(dfd.reject, dfd.callback(function (error) {
				assert.instanceOf(error, SyntaxError, 'should be rejected with SyntaxError');
				assert.strictEqual(error.message, 'Unrecognized report type of "foo".',
					'should have proper error message');
			}));
		},

		'clover': function () {
			return writeReport(coverage, 'clover', {}, 'tmp/clover.xml').then(function () {
				var contents = fs.readFileSync('tmp/clover.xml', { encoding: 'utf8' });
				assert(contents, 'the report should exist');
				assert.include(contents, 'path="' + path.join('tests', 'unit', 'support', 'basic.ts') + '"', 'contains the remapped file');
			});
		},

		'cobertura': function () {
			return writeReport(coverage, 'cobertura', {}, 'tmp/cobertura.xml').then(function () {
				var contents = fs.readFileSync('tmp/cobertura.xml', { encoding: 'utf8' });
				assert(contents, 'the report should exist');
				assert.include(contents, 'filename="' + path.join('tests', 'unit', 'support', 'basic.ts') + '"', 'contains the remapped file');
			});
		},

		'html': function () {
			return writeReport(coverage, 'html', {}, 'tmp/html-report').then(function () {
				var html = fs.readFileSync('tmp/html-report/support/basic.ts.html', { encoding: 'utf8' });
				assert(html, 'should have content for basic.ts');
				assert.include(html, 'export class Foo {', 'should contain some of the origin file');
			});
		},

		'html with inlines sources': function () {
			var sources = new MemoryStore();
			var inlineSourceCoverage = remap(loadCoverage('tests/unit/support/coverage-inlinesource.json'), {
				sources: sources
			});
			return writeReport(inlineSourceCoverage, 'html', {}, 'tmp/html-report-inline', sources).then(function () {
				// Istanbul does not place supporting HTML files in the same directory structure for all OSes.  It is not super important
				// because the parent index.html is always in the destination directory.
				assert(fs.existsSync('tmp/html-report-inline/index.html'));
				var path = 'tmp/html-report-inline/support/inlinesource.ts.html';
				if (!fs.existsSync(path)) {
					path = 'tmp/html-report-inline/tests/unit/support/inlinesource.ts.html';
				}
				var html = fs.readFileSync(path, { encoding: 'utf8' });
				assert(html, 'should have content for inlinesource.ts');
				assert.include(html, "let foo = new Foo", 'should contain some of the origin file');
			});
		},

		'json-summary': function () {
			return writeReport(coverage, 'json-summary', {}, 'tmp/summary.json').then(function () {
				var contents = fs.readFileSync('tmp/summary.json', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				var summary = JSON.parse(contents);
				assert(summary[path.join('tests', 'unit', 'support', 'basic.ts')], 'there should be a key with a summary');
				assert(summary.total, 'there should be a total key');
				assert.strictEqual(Object.keys(summary).length, 2, 'there should be only two keys');
			});
		},

		'json': function () {
			return writeReport(coverage, 'json', {}, 'tmp/coverage-out.json').then(function () {
				var contents = fs.readFileSync('tmp/coverage-out.json', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				var report = JSON.parse(contents);
				assert(report[path.join('tests', 'unit', 'support', 'basic.ts')], 'there should be a key with coverage');
				assert.strictEqual(Object.keys(report).length, 1, 'there should be only one key in report');
			});
		},

		'lcovonly': function () {
			return writeReport(coverage, 'lcovonly', {}, 'tmp/lcov.info').then(function () {
				var contents = fs.readFileSync('tmp/lcov.info', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				assert.include(contents, 'SF:'+ path.join('tests', 'unit', 'support', 'basic.ts'),
					'should contain the name of the remapped file');
			});
		},

		'teamcity': function () {
			return writeReport(coverage, 'teamcity', {}, 'tmp/teamcity.txt').then(function () {
				var contents = fs.readFileSync('tmp/teamcity.txt', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				assert.include(contents, '##teamcity[blockOpened name=\'Code Coverage Summary\']',
					'containts an opening block for coverage');
			});
		},

		'text-lcov': {
			'no dest': function () {
				consoleLog = console.log;
				console.log = mockLog;
				return writeReport(coverage, 'text-lcov', {}).then(function () {
					console.log = consoleLog;
					assert.strictEqual(consoleOutput.length, 59,
						'console should have the right number of lines');
					assert.strictEqual(consoleOutput[1][0], 'SF:'+ path.join('tests', 'unit', 'support', 'basic.ts'),
						'console should have logged the right file');
					consoleOutput = [];
				});
			},
			'dest': function () {
				return writeReport(coverage, 'text-lcov', {}, function () {
					consoleOutput.push(arguments);
				}).then(function () {
					assert.strictEqual(consoleOutput.length, 59,
						'console should have the right number of lines');
					assert.strictEqual(consoleOutput[1][0], 'SF:'+ path.join('tests', 'unit', 'support', 'basic.ts'),
						'console should have logged the right file');
					consoleOutput = [];
				});
			}
		},

		'text-summary': function () {
			return writeReport(coverage, 'text-summary', {}, 'tmp/summary.txt').then(function () {
				var contents = fs.readFileSync('tmp/summary.txt', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				assert.include(contents, 'Coverage summary', 'contains a summary header');
			});
		},

		'text': function () {
			return writeReport(coverage, 'text', {}, 'tmp/coverage.txt').then(function () {
				var contents = fs.readFileSync('tmp/coverage.txt', { encoding: 'utf8' });
				assert(contents, 'there should be contents');
				assert.include(contents, 'basic.ts', 'contains the file we remapped');
			});
		}
	}
});
