/* jshint node: true */
/* jshint -W079 */

const Collector = require('istanbul/lib/collector');
const path = require('path');
const fs = require('fs');
const { SourceMapConsumer } = require('source-map/lib/source-map-consumer');

const sourceMapRegEx = /(?:\/{2}[#@]{1,2}|\/\*)\s+sourceMappingURL\s*=\s*(data:(?:[^;]+;)+base64,)?(\S+)/;

const SparceCoverageCollector = require('./SparceCoverageCollector');

const getMapping = require('./getMapping');

const remapFunction = require('./remapFunction');
const remapBranch = require('./remapBranch');

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
function remap(coverage, options = {}) {
  const warn = options.warn || console.warn;

  let exclude;
  if (options.exclude) {
    if (typeof options.exclude === 'string') {
      exclude = (fileName) => fileName.indexOf(options.exclude) > -1;
    } else {
      exclude = (fileName) => fileName.match(options.exclude);
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


  if (!Array.isArray(coverage)) {
    coverage = [coverage];
  }

  const sparceCoverageCollector = new SparceCoverageCollector();

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
        sparceCoverageCollector.setCoverage(filePath, fileCoverage);
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
          sparceCoverageCollector.setSourceCode(sourceMap.sources[idx], codeIsArray ? source.split('\n') : source);
          if (sourceStore) {
            sourceStore.set(sourceMap.sources[idx], source);
          }
        });
      }

      function resolvePath(source) {
        let resolvedSource = source in inlineSourceMap
          ? source
          : path.resolve(sourceMapDir, source);
        if (!useAbsolutePaths && !(source in inlineSourceMap)) {
          resolvedSource = path.relative(process.cwd(), resolvedSource);
        }
        return resolvedSource;
      }

      const getMappingResolved = (location) => {
        const mapping = getMapping(sourceMap, location);
        if (!mapping) return null;
        return Object.assign(mapping, { source: resolvePath(mapping.source) });
      };

      Object.keys(fileCoverage.branchMap).forEach((index) => {
        const genItem = fileCoverage.branchMap[index];
        const hits = fileCoverage.b[index];
        const info = remapBranch(genItem, getMappingResolved);
        if (info) {
          sparceCoverageCollector.updateBranch(info.source, info.srcItem, hits);
        }
      });

      Object.keys(fileCoverage.fnMap).forEach((index) => {
        const genItem = fileCoverage.fnMap[index];
        const hits = fileCoverage.f[index];

        const info = remapFunction(genItem, getMappingResolved);

        if (info) {
          sparceCoverageCollector.updateFunction(info.source, info.srcItem, hits);
        }
      });

      Object.keys(fileCoverage.statementMap).forEach((index) => {
        const genItem = fileCoverage.statementMap[index];
        const hits = fileCoverage.s[index];

        const mapping = getMappingResolved(genItem);

        if (mapping) {
          sparceCoverageCollector.updateStatement(mapping.source, mapping.loc, hits);
        }
      });

      // todo: refactor exposing implementation details
      const srcCoverage = sparceCoverageCollector.getFilesCoverage();

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

  const srcCoverage = sparceCoverageCollector.getFilesCoverage();

  collector.add(Object.keys(srcCoverage)
    .filter((filePath) => !(exclude && exclude(filePath)))
    .reduce((obj, name) => {
      obj[name] = srcCoverage[name];
      return obj;
    }, {}));

  /* refreshes the line counts for reports */
  collector.getFinalCoverage();

  return collector;
}

module.exports = remap;
