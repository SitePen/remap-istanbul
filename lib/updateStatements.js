const updateFunctions = (fileCoverage, getMappingResolved, sparceCoverageCollector) => {
  Object.keys(fileCoverage.statementMap).forEach((index) => {
    const genItem = fileCoverage.statementMap[index];
    const hits = fileCoverage.s[index];

    const mapping = getMappingResolved(genItem);

    if (mapping) {
      sparceCoverageCollector.updateStatement(mapping.source, mapping.loc, hits);
    }
  });
};

module.exports = updateFunctions;
