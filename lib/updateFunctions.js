const remapFunction = require('./remapFunction');

const updateFunctions = (fileCoverage, getMappingResolved, sparceCoverageCollector) => {
  Object.keys(fileCoverage.fnMap).forEach((index) => {
    const genItem = fileCoverage.fnMap[index];
    const hits = fileCoverage.f[index];

    const info = remapFunction(genItem, getMappingResolved);

    if (info) {
      sparceCoverageCollector.updateFunction(info.source, info.srcItem, hits);
    }
  });
};

module.exports = updateFunctions;
