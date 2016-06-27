const Collector = require('istanbul/lib/collector');
const Reporter = require('istanbul/lib/report/json');

function JsonCoverageReporter(config) {
  config = config || {};

  this._collector = new Collector();
  this._reporter = new Reporter({
    file: config.filename,
    watermarks: config.watermarks
  });
}

JsonCoverageReporter.prototype.coverage = function (sessionId, coverage) {
  this._collector.add(coverage);
};

JsonCoverageReporter.prototype.runEnd = function () {
  this._reporter.writeReport(this._collector, true);
};

module.exports = JsonCoverageReporter;
