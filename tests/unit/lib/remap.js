const Collector = require('istanbul/lib/collector');
const MemoryStore = require('istanbul/lib/store/memory');
const path = require('path');
const loadCoverage = require('../../../lib/loadCoverage');
const remap = require('../../../lib/remap');

const registerSuite = intern.getPlugin('interface.object').registerSuite;
const assert = intern.getPlugin('chai').assert;
const sourceFilePath = path.join('tests', 'unit', 'support', 'basic.ts');

registerSuite('remap-istanbul/lib/remap', {
	'remapping': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map[sourceFilePath],
			'The Collector should have a remapped key');
		assert.strictEqual(Object.keys(coverage.store.map).length, 1,
			'Collector should only have one map');
		var map = JSON.parse(coverage.store.map[sourceFilePath]);
		assert.strictEqual(map.path, sourceFilePath);
		assert.strictEqual(Object.keys(map.statementMap).length, 28, 'Map should have 28 statements');
		assert.strictEqual(Object.keys(map.fnMap).length, 6, 'Map should have 6 functions');
		assert.strictEqual(Object.keys(map.branchMap).length, 6, 'Map should have 6 branches');
	},

	'base64 source map': function () {
		var coverage = remap(loadCoverage('tests/unit/support/inline-coverage.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map[sourceFilePath],
			'The Collector should have a remapped key');
		assert.strictEqual(Object.keys(coverage.store.map).length, 1,
			'Collector should only have one map');
		var map = JSON.parse(coverage.store.map[sourceFilePath]);
		assert.strictEqual(map.path, sourceFilePath);
		assert.strictEqual(Object.keys(map.statementMap).length, 28, 'Map should have 28 statements');
		assert.strictEqual(Object.keys(map.fnMap).length, 6, 'Map should have 6 functions');
		assert.strictEqual(Object.keys(map.branchMap).length, 6, 'Map should have 6 branches');
	},

	'base64 source map with sources': function () {
		var store = new MemoryStore();
		remap(loadCoverage('tests/unit/support/coverage-inlinesource.json'), {
			sources: store
		});
		assert(store.map['tests/unit/support/inlinesource.ts'], 'Source should have been retrieved from source map');
	},

	'base64 source map with base path': function () {
		var basePath = 'foo/bar';
		var coverage = remap(loadCoverage('tests/unit/support/coverage-inlinesource.json'), {
			basePath: basePath
		});
		var inlineSourcePath = path.join('foo', 'bar', 'inlinesource.ts');
		assert(coverage.store.map[inlineSourcePath], 'Source should have been retrieved from source map using base path');
	},

	'coverage includes code': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-code.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map['tests/unit/support/basic-code.ts']);
		var map = JSON.parse(coverage.store.map['tests/unit/support/basic-code.ts']);
		assert.typeOf(map.code, 'string', 'should respect source mapping');
	},

	'coverage includes code as array': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-code-array.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map['tests/unit/support/basic-code.ts']);
		var map = JSON.parse(coverage.store.map['tests/unit/support/basic-code.ts']);
		assert.isTrue(Array.isArray(map.code));
	},

	'coverage includes code but missing sourceMappingURL': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-code-withoutSourceMappingURL.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map[sourceFilePath]);
	},

	'coverage includes code as array but missing sourceMappingURL': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-code-array-withoutSourceMappingURL.json'));
		assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
		assert(coverage.store.map[sourceFilePath]);
	},

	'coverage includes sourcemap': function () {
		var coverage = remap(loadCoverage('tests/unit/support/inline-coverage-inputSourceMap-customSourceRoot.json'));
		assert(coverage.store.map['tests/unit/support/customSourceRoot/basic.ts'] || coverage.store.map['tests\\unit\\support\\customSourceRoot\\basic.ts'],
			'The inputSourceMap in coverage should have been used');
	},

	'empty options': function () {
		assert.throws(remap, TypeError);
	},

	'basePath' : function() {
		var coverage = remap(loadCoverage('tests/unit/support/coverage.json'), {
			basePath : 'foo/bar'
		});

		var basicFilePath = path.join('foo', 'bar', 'basic.ts');
		assert(coverage.store.map[basicFilePath],  'The base path provided should have been used');
		assert.strictEqual(Object.keys(coverage.store.map).length, 1,
			'Collector should only have one map');
		var map = JSON.parse(coverage.store.map[basicFilePath]);
		assert.strictEqual(map.path, basicFilePath, 'The base path should be used in the map as well');
	},

	'missing coverage source': function () {
		var warnStack = [];
		function warn() {
			warnStack.push(arguments);
		}
		remap(loadCoverage('tests/unit/support/badcoverage.json'), {
			warn: warn
		});
		assert.strictEqual(warnStack.length, 3, 'warn should have been called three times');
		assert.instanceOf(warnStack[0][0], Error, 'should have been called with error');
		assert.strictEqual(warnStack[0][0].message, 'Could not find file: "tests/unit/support/bad.js"',
			'proper error message should have been returned');
		assert.instanceOf(warnStack[1][0], Error, 'should have been called with error');
		assert.strictEqual(warnStack[1][0].message, 'Could not find source map for: "tests/unit/support/bad.js"',
			'proper error message should have been returned');
	},

	'duplicate sourceMappingURL': function () {
		var warnStack = [];
		function warn() {
			warnStack.push(arguments);
		}

		var coverage = remap(loadCoverage('tests/unit/support/coverage-duplicatemap.json'), {
			warn: warn
		});

		// There should be a warning for `sourceMappingURL=wrongmatch.js.map` in duplicatemap.js
		assert.strictEqual(warnStack.length, 1);
		assert(coverage.store.map['tests/unit/support/duplicatemap.ts']);
	},

	'missing source map': function () {
		var warnStack = [];
		function warn() {
			warnStack.push(arguments);
		}
		remap(loadCoverage('tests/unit/support/missingmapcoverage.json'), {
			warn: warn
		});

		var mapFilePath = path.join('tests', 'unit', 'support', 'missingmap.js.map');
		assert.strictEqual(warnStack.length, 2, 'warn should have been called twice');
		assert.instanceOf(warnStack[0][0], Error, 'should have been called with error');
		assert.strictEqual(warnStack[0][0].message, 'Could not find file: "' + mapFilePath + '"',
			'proper error message should have been returned');
		assert.instanceOf(warnStack[1][0], Error, 'should have been called with error');
		assert.strictEqual(warnStack[1][0].message, 'Could not find source map for: "tests/unit/support/missingmap.js"',
			'proper error message should have been returned');
	},

	'unicode in map': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-unicode.json'));
		var sourceFilePath = path.join('tests', 'unit', 'support', 'unicode.ts');

		assert(coverage.store.map[sourceFilePath], 'The file should have been properly mapped.');
		assert.strictEqual(Object.keys(coverage.store.map).length, 1,
			'Collector should have only one map.');
	},

	'skip in source map': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage-skip.json'));

		var coverageData = JSON.parse(coverage.store.map[sourceFilePath]);
		assert.isTrue(coverageData.statementMap['18'].skip, 'skip is perpetuated');
		assert.isUndefined(coverageData.statementMap['1'].skip, 'skip is not present');
		assert.isTrue(coverageData.fnMap['5'].skip, 'skip is perpetuated');
		assert.isUndefined(coverageData.fnMap['1'].skip, 'skip is not present');
	},

	'lineless items in source map should not error': function () {
		remap(loadCoverage('tests/unit/support/nosourceline.json'));
	},

	'non transpiled coverage': function () {
		var warnStack = [];

		var coverage = remap(loadCoverage('tests/unit/support/coverage-import.json'), {
			warn: function () {
				warnStack.push(arguments);
			}
		});

		var coverageData = JSON.parse(coverage.store.map['tests/unit/support/foo.js']);
		assert.strictEqual(1, coverageData.statementMap['1'].start.line);
		assert.strictEqual(1, warnStack.length);
		assert.instanceOf(warnStack[0][0], Error, 'should have been called with error');
		assert.strictEqual(warnStack[0][0].message, 'Could not find source map for: "tests/unit/support/foo.js"',
			'proper error message should have been returend');
	},

	'exclude - string': function () {
		var warnStack = [];

		var coverage = remap(loadCoverage('tests/unit/support/coverage-import.json'), {
			warn: function () {
				warnStack.push(arguments);
			},
			exclude: 'foo.js'
		});

		assert.strictEqual(1, warnStack.length);
		assert.strictEqual(warnStack[0][0], 'Excluding: "tests/unit/support/foo.js"');
	},

	'exclude - RegEx': function () {
		var warnStack = [];

		remap(loadCoverage('tests/unit/support/coverage-import.json'), {
			warn: function () {
				warnStack.push(arguments);
			},
			exclude: /foo\.js$/
		});

		assert.strictEqual(1, warnStack.length);
		assert.strictEqual(warnStack[0][0], 'Excluding: "tests/unit/support/foo.js"');
	},

	'exclude - Function': function () {
		var warnStack = [];

		remap(loadCoverage('tests/unit/support/coverage-import.json'), {
			warn: function () {
				warnStack.push(arguments);
			},
			exclude: function(filename) {
				return filename === 'tests/unit/support/foo.js';
			}
		});

		assert.strictEqual(1, warnStack.length);
		assert.strictEqual(warnStack[0][0], 'Excluding: "tests/unit/support/foo.js"');

	},

	'mapFileName': function () {
		var warnStack = [];

		var coverage = remap(loadCoverage('tests/unit/support/coverage.json'), {
			warn: function () {
				warnStack.push(arguments);
			},
			mapFileName: function (filename) {
				return path.join('bar', filename);
			}
		});

		assert.strictEqual(warnStack.length, 0);
		var sourceFilePath = path.join('bar', 'tests', 'unit', 'support', 'basic.ts');
		var coverageData = JSON.parse(coverage.store.map[sourceFilePath]);
		assert.strictEqual(coverageData.path, sourceFilePath);
	},

	'mapFileName with sources': function () {
		var store = new MemoryStore();
		remap(loadCoverage('tests/unit/support/coverage-inlinesource.json'), {
			sources: store,

			mapFileName: function (filename) {
				return 'bar/' + filename;
			}
		});
		assert(store.map['bar/tests/unit/support/inlinesource.ts'], 'Source should be available on renamed file');
	},

	'useAbsolutePaths': function () {
		var coverage = remap(loadCoverage('tests/unit/support/coverage.json'), {
			useAbsolutePaths: true
		});

		var absoluteKey = path.resolve(process.cwd(), 'tests/unit/support/basic.ts');
		assert(coverage.store.map[absoluteKey],
			'The Collector should have a key with absolute path');
		assert.strictEqual(Object.keys(coverage.store.map).length, 1,
			'Collector should only have one map');
	},

	'fnMap with decl': function () {
		var coverage = remap(loadCoverage('tests/unit/support/nyc_coverage.json'));
		var sourceFilePath = path.join('tests', 'unit', 'support', 'nyc_coverage.ts');
		var coverageData = JSON.parse(coverage.store.map[sourceFilePath]);

		assert(coverageData.fnMap[1].decl);
	},

	'branchMap with loc': function () {
		var coverage = remap(loadCoverage('tests/unit/support/nyc_coverage.json'));
		var sourceFilePath = path.join('tests', 'unit', 'support', 'nyc_coverage.ts');
		var coverageData = JSON.parse(coverage.store.map[sourceFilePath]);

		assert(coverageData.branchMap[1].loc);
	},
});
