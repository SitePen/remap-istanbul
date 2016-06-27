const remapBranch = require('./remapBranch');

const updateFunctions = (fileCoverage, getMappingResolved, getSourceCoverage) => {
  function updateItem(source, srcItem, hits) {
    const { data, meta } = getSourceCoverage(source);

    let key = ['b'];
    srcItem.locations.map(loc => key.push(
      loc.start.line, loc.start.column,
      loc.end.line, loc.end.line
    ));

    key = key.join(':');

    let index = meta.indexes[key];
    if (!index) {
      index = ++meta.lastIndex.b;
      meta.indexes[key] = index;
      data.branchMap[index] = srcItem;
    }

    if (!data.b[index]) {
      data.b[index] = hits.map(v => v);
    } else {
      for (let i = 0; i < hits.length; ++i) {
        data.b[index][i] += hits[i];
      }
    }
  }

  Object.keys(fileCoverage.branchMap).forEach((index) => {
    const genItem = fileCoverage.branchMap[index];
    const hits = fileCoverage.b[index];
    const info = remapBranch(genItem, getMappingResolved);
    if (info) {
      updateItem(info.source, info.srcItem, hits);
    }
  });
};

module.exports = updateFunctions;
