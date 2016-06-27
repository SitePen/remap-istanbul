/* jshint node: true */
/* jshint -W079 */

const Collector = require('istanbul/lib/collector');
const path = require('path');
const fs = require('fs');
const { SourceMapConsumer } = require('source-map/lib/source-map-consumer');

/* global WeakMap */


const sourceMapRegEx = /(?:\/{2}[#@]{1,2}|\/\*)\s+sourceMappingURL\s*=\s*(data:(?:[^;]+;)+base64,)?(\S+)/;

const MaybeWeakMap = typeof WeakMap === 'function' ? WeakMap : function () {
  const objectList = [];
  const dataList = [];

  this.set = function (object, data) {
    const index = objectList.indexOf(object);
    if (index !== -1) {
      data[index] = data;
    } else {
      objectList.push(object);
      dataList.push(data);
    }
  };

  this.get = function (object) {
    const index = objectList.indexOf(object);
    if (index !== -1) {
      return dataList[index];
    }
  };
};

const metaInfo = new MaybeWeakMap();
/**
 * Generate a coverage object that will be filled with the remapped data
 * @param  {Object} srcCoverage The coverage object to be populated
 * @param  {string} filename    The name of the file that is being remapped
 * @return {Object}             An object that provides the actual data and
 *                              its shadow data used for reference.
 */
function getSourceCoverage(srcCoverage, filename) {
  let data = srcCoverage[filename];
  if (!data) {
    data = srcCoverage[filename] = {
      path: filename,
      statementMap: {},
      fnMap: {},
      branchMap: {},
      s: {},
      b: {},
      f: {},
    };
    metaInfo.set(data, {
      indexes: {},
      lastIndex: {
        s: 0,
        b: 0,
        f: 0,
      },
    });
  }

  return {
    data,
    meta: metaInfo.get(data),
  };
}

/**
 * A function that determines the original position for a given location
 * @param  {SourceMapConsumer} sourceMap        The source map
 * @param  {string}            sourceMapDir     The directory where the original is located
 * @param  {Object}            location         The original location Object
 * @param  {Boolean}           useAbsolutePaths If `true`, don't resolve the path relative to the `cwd`
 * @param  {Object}            inlineSourceMap  If `true`, don't try to resolve the source path, just copy it
 * @return {Object}                             The remapped location Object
 */
function getMapping(sourceMap, sourceMapDir, location, useAbsolutePaths, inlineSourceMap) {
  /* jshint maxcomplexity: 15 */

  /* istanbul ignore if: edge case too hard to test for with babel malformation */
  if (location.start.line < 1 || location.start.column < 0) {
    return null;
  }
  /* istanbul ignore if: edge case too hard to test for with babel malformation */
  if (location.end.line < 1 || location.end.column < 0) {
    return null;
  }

  const start = sourceMap.originalPositionFor(location.start);
  let end = sourceMap.originalPositionFor(location.end);
  let resolvedSource;

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

  if (start.line === end.line && start.column === end.column) {
    end = sourceMap.originalPositionFor({
      line: location.end.line,
      column: location.end.column,
      bias: 2,
    });
    end.column = end.column - 1;
  }

  resolvedSource = start.source in inlineSourceMap ? start.source : path.resolve(sourceMapDir, start.source);
  if (!useAbsolutePaths && !(start.source in inlineSourceMap)) {
    resolvedSource = path.relative(process.cwd(), resolvedSource);
  }
  return {
    source: resolvedSource,
    loc: {
      start: {
        line: start.line,
        column: start.column,
      },
      end: {
        line: end.line,
        column: end.column,
      },
      skip: location.skip,
    },
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
 *                              exclude?  - a string or Regular Expression that filters out
 *                                          any coverage where the file path matches
 *                              readFile? - a function that can read a file
 *                                          syncronously
 *                              readJSON? - a function that can read and parse a
 *                                          JSON file syncronously
 *                              sources?  - a Istanbul store where inline sources will be
 *                                          added
 *                              warn?     - a function that logs warnings
 * @return {istanbul/lib/_collector}         The remapped collector
 */
module.exports = function remap(coverage, options = {}) {
  const warn = options.warn || console.warn;

  let exclude;
  if (options.exclude) {
    if (typeof options.exclude === 'string') {
      exclude = function (fileName) {
        return fileName.indexOf(options.exclude) > -1;
      };
    } else {
      exclude = function (fileName) {
        return fileName.match(options.exclude);
      };
    }
  }

  const useAbsolutePaths = !!options.useAbsolutePaths;

  const sourceStore = options.sources;

  const readJSON = options.readJSON
    || function readJSON(filePath) {
      if (!fs.existsSync(filePath)) {
        warn(new Error('Could not find file: "' + filePath + '"'));
        return null;
      }
      return JSON.parse(fs.readFileSync(filePath));
    };

  const readFile = options.readFile
    || function readFile(filePath) {
      if (!fs.existsSync(filePath)) {
        warn(new Error('Could not find file: "' + filePath + '"'));
        return '';
      }
      return fs.readFileSync(filePath);
    };

  let srcCoverage = {};

  if (!Array.isArray(coverage)) {
    coverage = [coverage];
  }

  coverage.forEach((item) => {
    Object.keys(item).forEach((filePath) => {
      if (exclude && exclude(filePath)) {
        warn(`Excluding: "${filePath}"`);
        return;
      }
      const fileCoverage = item[filePath];
      /* coverage.json can sometimes include the code inline */
      let codeIsArray = true;
      let codeFromFile = false;
      let jsText = fileCoverage.code;
      if (!jsText) {
        jsText = readFile(filePath);
        codeFromFile = true;
      }
      if (Array.isArray(jsText)) { /* sometimes the source is an array */
        jsText = jsText.join('\n');
      } else {
        codeIsArray = false;
      }
      let match = sourceMapRegEx.exec(jsText);
      let sourceMapDir = path.dirname(filePath);
      let rawSourceMap;

      if (!match && !codeFromFile) {
        codeIsArray = false;
        jsText = readFile(filePath);
        match = sourceMapRegEx.exec(jsText);
      }

      if (match) {
        if (match[1]) {
          rawSourceMap = JSON.parse((new Buffer(match[2], 'base64').toString('utf8')));
        } else {
          const sourceMapPath = path.join(sourceMapDir, match[2]);
          rawSourceMap = readJSON(sourceMapPath);
          sourceMapDir = path.dirname(sourceMapPath);
        }
      }

      if (!match || !rawSourceMap) {
        /* We couldn't find a source map, so will copy coverage after warning. */
        warn(new Error(`Could not find source map for: "${filePath}"`));
        try {
          fileCoverage.code = String(fs.readFileSync(filePath)).split('\n');
        } catch (error) {
          warn(new Error(`Could find source for : "${filePath}"`));
        }
        srcCoverage[filePath] = fileCoverage;
        return;
      }

      sourceMapDir = options.basePath || sourceMapDir;

      // replace relative paths in source maps with absolute
      rawSourceMap.sources = rawSourceMap.sources.map((srcPath) => (
        srcPath.substr(0, 1) === '.'
          ? path.resolve(sourceMapDir, srcPath)
          : srcPath
      ));

      let sourceMap = new SourceMapConsumer(rawSourceMap);

      /* if there are inline sources and a store to put them into, we will populate it */
      const inlineSourceMap = {};
      let origSourceFilename;
      let origFileName;
      let fileName;

      if (sourceMap.sourcesContent) {
        origSourceFilename = rawSourceMap.sources[0];

        if (path.extname(origSourceFilename) !== '') {
          origFileName = rawSourceMap.file;
          fileName = filePath.replace(path.extname(origFileName), path.extname(origSourceFilename));
          rawSourceMap.file = fileName;
          rawSourceMap.sources = [fileName];
          rawSourceMap.sourceRoot = '';
          sourceMap = new SourceMapConsumer(rawSourceMap);
        }

        sourceMap.sourcesContent.forEach((source, idx) => {
          inlineSourceMap[sourceMap.sources[idx]] = true;
          getSourceCoverage(srcCoverage, sourceMap.sources[idx]).data.code = codeIsArray ? source.split('\n') : source;
          if (sourceStore) {
            sourceStore.set(sourceMap.sources[idx], source);
          }
        });
      }

      Object.keys(fileCoverage.fnMap).forEach((index) => {
        const genItem = fileCoverage.fnMap[index];
        const mapping = getMapping(sourceMap, sourceMapDir, genItem.loc, useAbsolutePaths, inlineSourceMap);

        if (!mapping) {
          return;
        }

        const hits = fileCoverage.f[index];
        const covInfo = getSourceCoverage(srcCoverage, mapping.source);
        const data = covInfo.data;
        const meta = covInfo.meta;
        const srcItem = {
          name: genItem.name,
          line: mapping.loc.start.line,
          loc: mapping.loc,
        };
        if (genItem.skip) {
          srcItem.skip = genItem.skip;
        }
        const key = [
          'f',
          srcItem.loc.start.line, srcItem.loc.start.column,
          srcItem.loc.end.line, srcItem.loc.end.column,
        ].join(':');

        let fnIndex = meta.indexes[key];
        if (!fnIndex) {
          fnIndex = ++meta.lastIndex.f;
          meta.indexes[key] = fnIndex;
          data.fnMap[fnIndex] = srcItem;
        }
        data.f[fnIndex] = data.f[fnIndex] || 0;
        data.f[fnIndex] += hits;
      });

      Object.keys(fileCoverage.statementMap).forEach((index) => {
        const genItem = fileCoverage.statementMap[index];

        const mapping = getMapping(sourceMap, sourceMapDir, genItem, useAbsolutePaths, inlineSourceMap);

        if (!mapping) {
          return;
        }

        const hits = fileCoverage.s[index];
        const covInfo = getSourceCoverage(srcCoverage, mapping.source);
        const data = covInfo.data;
        const meta = covInfo.meta;

        const key = [
          's',
          mapping.loc.start.line, mapping.loc.start.column,
          mapping.loc.end.line, mapping.loc.end.column,
        ].join(':');

        let stIndex = meta.indexes[key];
        if (!stIndex) {
          stIndex = ++meta.lastIndex.s;
          meta.indexes[key] = stIndex;
          data.statementMap[stIndex] = mapping.loc;
        }
        data.s[stIndex] = data.s[stIndex] || 0;
        data.s[stIndex] += hits;
      });

      Object.keys(fileCoverage.branchMap).forEach((index) => {
        const genItem = fileCoverage.branchMap[index];
        const locations = [];
        let source;
        let key = ['b'];

        for (let i = 0; i < genItem.locations.length; ++i) {
          const mapping = getMapping(sourceMap, sourceMapDir, genItem.locations[i], useAbsolutePaths, inlineSourceMap);
          if (!mapping) {
            return;
          }
          /* istanbul ignore else: edge case too hard to test for */
          if (!source) {
            source = mapping.source;
          } else if (source !== mapping.source) {
            return;
          }
          locations.push(mapping.loc);
          key.push(
            mapping.loc.start.line, mapping.loc.start.column,
            mapping.loc.end.line, mapping.loc.end.line
          );
        }

        key = key.join(':');

        const hits = fileCoverage.b[index];
        const covInfo = getSourceCoverage(srcCoverage, source);
        const data = covInfo.data;
        const meta = covInfo.meta;

        let brIndex = meta.indexes[key];
        if (!brIndex) {
          brIndex = ++meta.lastIndex.b;
          meta.indexes[key] = brIndex;
          data.branchMap[brIndex] = {
            line: locations[0].start.line,
            type: genItem.type,
            locations,
          };
        }

        if (!data.b[brIndex]) {
          data.b[brIndex] = locations.map(() => 0);
        }

        for (let i = 0; i < hits.length; ++i) {
          data.b[brIndex][i] += hits[i];
        }
      });

      if (sourceMap.sourcesContent && options.basePath) {
        // Convert path to use base path option
        const getPath = filePath => {
          const absolutePath = path.resolve(options.basePath, filePath);
          if (!useAbsolutePaths) {
            return path.relative(process.cwd(), absolutePath);
          }
          return absolutePath;
        };
        const fullSourceMapPath = getPath(
          origFileName.replace(path.extname(origFileName), path.extname(origSourceFilename))
        );
        srcCoverage[fullSourceMapPath] = srcCoverage[fileName];
        srcCoverage[fullSourceMapPath].path = fullSourceMapPath;
        delete srcCoverage[fileName];
      }
    });
  });

  const collector = new Collector();

  srcCoverage = Object.keys(srcCoverage)
    .filter((filePath) => !(exclude && exclude(filePath)))
    .reduce((obj, name) => {
      obj[name] = srcCoverage[name];
      return obj;
    }, {});

  collector.add(srcCoverage);

  /* refreshes the line counts for reports */
  collector.getFinalCoverage();

  return collector;
};
