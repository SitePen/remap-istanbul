/* jshint node: true */
/*jshint -W079 */
if (typeof define !== 'function') { /* istanbul ignore next */ var define = require('amdefine')(module); }
define([
	'require',
	'exports',
	'./node!istanbul/lib/collector',
	'./node!path',
	'./node!fs',
	'source-map/lib/source-map/source-map-consumer'
], function (require, exports, Collector, path, fs, smc) {
	/* global WeakMap */

	var SourceMapConsumer = smc.SourceMapConsumer;

	var sourceMapRegEx = /(?:\/{2}[#@]{1,2}|\/\*)\s+sourceMappingURL\s*=\s*(data:(?:[^;]+;)+base64,)?(\S+)/;

	var metaInfo = new WeakMap();

	/**
	 * Generate a coverage object that will be filled with the remapped data
	 * @param  {Object} srcCoverage The coverage object to be populated
	 * @param  {string} filename    The name of the file that is being remapped
	 * @return {Object}             An object that provides the actual data and
	 *                              its shadow data used for reference.
	 */
	function getSourceCoverage(srcCoverage, filename) {
		var data = srcCoverage[filename];
		if (!data) {
			data = srcCoverage[filename] = {
				path: filename,
				statementMap: {},
				fnMap: {},
				branchMap: {},
				s: {},
				b: {},
				f: {}
			};
			metaInfo.set(data, {
				indexes: {},
				lastIndex: {
					s: 0,
					b: 0,
					f: 0
				}
			});
		}

		return {
			data: data,
			meta: metaInfo.get(data)
		};
	}

	/**
	 * A function that determines the original position for a given location
	 * @param  {SourceMapConsumer} sourceMap    The source map
	 * @param  {string} sourceMapDir The directory where the original is located
	 * @param  {Object} location     The original location Object
	 * @return {Object}              The remapped location Object
	 */
	function getMapping(sourceMap, sourceMapDir, location) {
		/* jshint maxcomplexity: 11 */
		var start = sourceMap.originalPositionFor(location.start);
		var end = sourceMap.originalPositionFor(location.end);
		var src;

		/* istanbul ignore if: edge case too hard to test for */
		if (!start || !end) {
			return null;
		}
		if (!start.source || !end.source || start.source !== end.source) {
			return null;
		}
		/* istanbul ignore if: edge case too hard to test for */
		if (start.line === null || start.column === null) {
			return null;
		}
		/* istanbul ignore if: edge case too hard to test for */
		if (end.line === null || end.column === null) {
			return null;
		}
		src = start.source;

		if (start.line === end.line && start.column === end.column) {
			end = sourceMap.originalPositionFor({
				line: location.end.line,
				column: location.end.column,
				bias: 2
			});
			end.column = end.column - 1;
		}

		return {
			source: path.join(sourceMapDir, start.source),
			loc: {
				start: {
					line: start.line,
					column: start.column
				},
				end: {
					line: end.line,
					column: end.column
				}
			}
		};
	}

	/**
	 * Remaps coverage data based on the source maps it discovers in the
	 * covered files and returns a coverage Collector that contains the remappped
	 * data.
	 * @param  {Array|Object} coverage The coverage (or array of coverages) that need to be
	 *                                                 remapped
	 * @param  {Object} options A configuration object:
	 *                              basePath? - a string containing to utilise as the base path
	 *                                          for determining the location of the source file
	 *                              readFile? - a function that can read a file
	 *                                          syncronously
	 *                              readJSON? - a function that can read and parse a
	 *                                          JSON file syncronously
	 *                              warn?     - a function that logs warnings
	 * @return {istanbul/lib/collector}         The remapped collector
	 */
	return function remap(coverage, options) {
		options = options || {};

		var warn = options.warn || console.warn;

		var readJSON = options.readJSON || function readJSON(filePath) {
			if (!fs.existsSync(filePath)) {
				throw new Error('Could not find file: "' + filePath + '"');
			}
			return JSON.parse(fs.readFileSync(filePath));
		};

		var readFile = options.readFile || function readFile(filePath) {
			if (!fs.existsSync(filePath)) {
				warn(new Error('Could not find file: "' + filePath + '"'));
				return '';
			}
			return fs.readFileSync(filePath);
		};

		var srcCoverage = {};

		if (!Array.isArray(coverage)) {
			coverage = [ coverage ];
		}

		coverage.forEach(function (item) {
			Object.keys(item).forEach(function (filePath) {
				var fileCoverage = item[filePath];
				var jsText = readFile(filePath);
				var match = sourceMapRegEx.exec(jsText);
				var sourceMapDir = path.dirname(filePath);
				var rawSourceMap;

				if (!match) {
					warn(new Error('Could not find source map for: "' + filePath + '"'));
					return;
				}

				if (match[1]) {
					rawSourceMap = JSON.parse((new Buffer(match[2], 'base64').toString('utf8')));
				}
				else {
					var sourceMapPath = path.join(sourceMapDir, match[2]);
					rawSourceMap = readJSON(sourceMapPath);
					sourceMapDir = path.dirname(sourceMapPath);
				}

				sourceMapDir = options.basePath || sourceMapDir;

				var sourceMap = new SourceMapConsumer(rawSourceMap);

				Object.keys(fileCoverage.fnMap).forEach(function (index) {
					var genItem = fileCoverage.fnMap[index];
					var mapping = getMapping(sourceMap, sourceMapDir, genItem.loc);

					if (!mapping) {
						return;
					}

					var hits = fileCoverage.f[index];
					var covInfo = getSourceCoverage(srcCoverage, mapping.source);
					var data = covInfo.data;
					var meta = covInfo.meta;
					var srcItem = {
						name: genItem.name,
						line: mapping.loc.start.line,
						loc: mapping.loc
					};
					var key = [
						'f',
						srcItem.loc.start.line, srcItem.loc.start.column,
						srcItem.loc.end.line, srcItem.loc.end.column
					].join(':');

					var fnIndex = meta.indexes[key];
					if (!fnIndex) {
						fnIndex = ++meta.lastIndex.f;
						meta.indexes[key] = fnIndex;
						data.fnMap[fnIndex] = srcItem;
					}
					data.f[fnIndex] = data.f[fnIndex] || 0;
					data.f[fnIndex] += hits;
				});

				Object.keys(fileCoverage.statementMap).forEach(function (index) {
					var genItem = fileCoverage.statementMap[index];
					var mapping = getMapping(sourceMap, sourceMapDir, genItem);

					if (!mapping) {
						return;
					}

					var hits = fileCoverage.s[index];
					var covInfo = getSourceCoverage(srcCoverage, mapping.source);
					var data = covInfo.data;
					var meta = covInfo.meta;

					var key = [
						's',
						mapping.loc.start.line, mapping.loc.start.column,
						mapping.loc.end.line, mapping.loc.end.column
					].join(':');

					var stIndex = meta.indexes[key];
					if (!stIndex) {
						stIndex = ++meta.lastIndex.s;
						meta.indexes[key] = stIndex;
						data.statementMap[stIndex] = mapping.loc;
					}
					data.s[stIndex] = data.s[stIndex] || 0;
					data.s[stIndex] += hits;
				});

				Object.keys(fileCoverage.branchMap).forEach(function (index) {
					var genItem = fileCoverage.branchMap[index];
					var locations = [];
					var source;
					var key = [ 'b' ];

					for (var i = 0; i < genItem.locations.length; ++i) {
						var mapping = getMapping(sourceMap, sourceMapDir, genItem.locations[i]);
						if (!mapping) {
							return;
						}
						/* istanbul ignore else: edge case too hard to test for */
						if (!source) {
							source = mapping.source;
						}
						else if (source !== mapping.source) {
							return;
						}
						locations.push(mapping.loc);
						key.push(
							mapping.loc.start.line, mapping.loc.start.column,
							mapping.loc.end.line, mapping.loc.end.line
						);
					}

					key = key.join(':');

					var hits = fileCoverage.b[index];
					var covInfo = getSourceCoverage(srcCoverage, source);
					var data = covInfo.data;
					var meta = covInfo.meta;

					var brIndex = meta.indexes[key];
					if (!brIndex) {
						brIndex = ++meta.lastIndex.b;
						meta.indexes[key] = brIndex;
						data.branchMap[brIndex] = {
							line: locations[0].start.line,
							type: genItem.type,
							locations: locations
						};
					}

					if (!data.b[brIndex]) {
						data.b[brIndex] = locations.map(function () {
							return 0;
						});
					}

					for (i = 0; i < hits.length; ++i) {
						data.b[brIndex][i] += hits[i];
					}
				});
			});
		});

		var collector = new Collector();
		collector.add(srcCoverage);

		/* refreshes the line counts for reports */
		collector.getFinalCoverage();

		return collector;
	};
});
