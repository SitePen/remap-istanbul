/* jshint node:true */
/* global Promise */
const loadCoverage = require('./lib/loadCoverage');
const remap = require('./lib/remap');
const writeReport = require('./lib/writeReport');
const MemoryStore = require('istanbul/lib/store/memory');

/**
 * The basic API for utilising remap-istanbul
 * @param  {Array|string} sources The sources that could be consumed and remapped.
 *                                For muliple sources to be combined together, provide
 *                                an array of strings.
 * @param  {Object} reports An object where each key is the report type required and the value
 *                          is the destination for the report.
 * @param  {Object} reportOptions? An object containing the report options.
 * @return {Promise}         A promise that will resolve when all the reports are written.
 */
module.exports = function (sources, reports, reportOptions) {
  let sourceStore = new MemoryStore();
  const collector = remap(loadCoverage(sources), {
    sources: sourceStore,
  });

  if (!Object.keys(sourceStore.map).length) {
    sourceStore = undefined;
  }


  return Promise.all(
    Object.keys(reports)
      .map(reportType =>
        writeReport(collector, reportType, reportOptions || {}, reports[reportType], sourceStore)
      )
  );
};

module.exports.loadCoverage = loadCoverage;
module.exports.remap = remap;
module.exports.writeReport = writeReport;
