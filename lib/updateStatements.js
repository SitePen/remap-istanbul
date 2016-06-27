const updateFunctions = (fileCoverage, getMappingResolved, getSourceCoverage) => {
  function updateItem(source, srcItem, hits) {
    const { data, meta } = getSourceCoverage(source);

    const key = [
      's',
      srcItem.start.line, srcItem.start.column,
      srcItem.end.line, srcItem.end.column,
    ].join(':');

    let index = meta.indexes[key];
    if (!index) {
      index = ++meta.lastIndex.s;
      meta.indexes[key] = index;
      data.statementMap[index] = srcItem;
    }

    data.s[index] = data.s[index] || 0;
    data.s[index] += hits;
  }

  Object.keys(fileCoverage.statementMap).forEach((index) => {
    const genItem = fileCoverage.statementMap[index];
    const hits = fileCoverage.s[index];

    const mapping = getMappingResolved(genItem);

    if (mapping) {
      updateItem(mapping.source, mapping.loc, hits);
    }
  });
};

module.exports = updateFunctions;
