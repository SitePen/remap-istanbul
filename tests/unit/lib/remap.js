define([
	'intern!object',
	'intern/chai!assert',
	'../../../lib/node!istanbul/lib/collector',
	'../../../lib/remap'
], function (registerSuite, assert, Collector, remap) {
	registerSuite({
		name: 'remap-istanbul/lib/remap',

		'remapping': function () {
			var coverage = remap({ sources: [ 'tests/unit/support/coverage.json' ] });
			assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
			assert(coverage.store.map['tests/unit/support/basic.ts'],
				'The Collector should have a remapped key');
			assert.strictEqual(Object.keys(coverage.store.map).length, 1,
				'Collector should only have one map');
			var map = JSON.parse(coverage.store.map['tests/unit/support/basic.ts']);
			assert.strictEqual(map.path, 'tests/unit/support/basic.ts');
			assert.strictEqual(Object.keys(map.statementMap).length, 28, 'Map should have 28 statements');
			assert.strictEqual(Object.keys(map.fnMap).length, 6, 'Map should have 6 functions');
			assert.strictEqual(Object.keys(map.branchMap).length, 6, 'Map should have 6 branches');
		},

		'base64 source map': function () {
			var coverage = remap({ sources: [ 'tests/unit/support/inline-coverage.json' ] });
			assert.instanceOf(coverage, Collector, 'Return values should be instance of Collector');
			assert(coverage.store.map['tests/unit/support/basic.ts'],
				'The Collector should have a remapped key');
			assert.strictEqual(Object.keys(coverage.store.map).length, 1,
				'Collector should only have one map');
			var map = JSON.parse(coverage.store.map['tests/unit/support/basic.ts']);
			assert.strictEqual(map.path, 'tests/unit/support/basic.ts');
			assert.strictEqual(Object.keys(map.statementMap).length, 28, 'Map should have 28 statements');
			assert.strictEqual(Object.keys(map.fnMap).length, 6, 'Map should have 6 functions');
			assert.strictEqual(Object.keys(map.branchMap).length, 6, 'Map should have 6 branches');
		},

		'invalid source path': function () {
			var warnStack = [];
			function warn() {
				warnStack.push(arguments);
			}

			remap({
				sources: [ 'badpath.json' ],
				warn: warn
			});

			assert.instanceOf(warnStack[0][0], Error);
			assert.strictEqual(warnStack[0][0].message, 'Cannot find file: "badpath.json"');
		},

		'empty sources': function () {
			var warnStack = [];
			function warn() {
				warnStack.push(arguments);
			}

			remap({
				sources: [],
				warn: warn
			});

			assert.instanceOf(warnStack[0][0], SyntaxError);
			assert.strictEqual(warnStack[0][0].message, 'No coverage files supplied!');
		},

		'empty options': function () {
			assert.throws(remap, TypeError);
		}
	});
});
