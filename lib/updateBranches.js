const remapBranch = require('./remapBranch');

const updateFunctions = (fileCoverage, getMappingResolved, sparceCoverageCollector) => {
  Object.keys(fileCoverage.branchMap).forEach((index) => {
    const genItem = fileCoverage.branchMap[index];
    const hits = fileCoverage.b[index];
    const info = remapBranch(genItem, getMappingResolved);
    if (info) {
      sparceCoverageCollector.updateBranch(info.source, info.srcItem, hits);
    }
  });
};

module.exports = updateFunctions;
