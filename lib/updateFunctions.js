const remapFunction = require('./remapFunction');

const updateFunctions = (fileCoverage, getMappingResolved, getSourceCoverage) => {
  function updateItem(source, srcItem, hits) {
    const { data, meta } = getSourceCoverage(source);

    const key = [
      'f',
      srcItem.loc.start.line, srcItem.loc.start.column,
      srcItem.loc.end.line, srcItem.loc.end.column,
    ].join(':');

    let index = meta.indexes[key];
    if (!index) {
      index = ++meta.lastIndex.f;
      meta.indexes[key] = index;
      data.fnMap[index] = srcItem;
    }

    data.f[index] = data.f[index] || 0;
    data.f[index] += hits;
  }

  Object.keys(fileCoverage.fnMap).forEach((index) => {
    const genItem = fileCoverage.fnMap[index];
    const hits = fileCoverage.f[index];

    const info = remapFunction(genItem, getMappingResolved);

    if (info) {
      updateItem(info.source, info.srcItem, hits);
    }
  });
};

module.exports = updateFunctions;
