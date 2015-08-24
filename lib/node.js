/* jshint node:true */
(function (deps, factory) {
	/* istanbul ignore next */
	if (typeof module === 'object' && typeof module.exports === 'object') {
		var v = factory(require, exports); if (v !== undefined) { module.exports = v; }
	} else if (typeof define === 'function' && define.amd) { define(deps, factory); }
})(['require', 'exports'], function (require, exports) {
	var global = (function () {
		return this;
	})();
	var nodeRequire = global.require && global.require.nodeRequire;
	if (!nodeRequire) {
		throw new Error('Cannot find the Node.js require');
	}
	var module = nodeRequire('module');
	function load(id, contextRequire, fn) {
		/*global define:true */
		if (module._findPath && module._nodeModulePaths) {
			var localModulePath = module._findPath(id, module._nodeModulePaths(contextRequire.toUrl('.')));
			if (localModulePath !== false) {
				id = localModulePath;
			}
		}
		var oldDefine = global.define;
		var result;
		global.define = undefined;
		try {
			result = nodeRequire(id);
		}
		finally {
			global.define = oldDefine;
		}
		fn(result);
	}
	exports.load = load;
	function normalize(id, fn) {
		if (id.charAt(0) === '.') {
			id = require.toUrl(fn('./' + id));
		}
		return id;
	}
	exports.normalize = normalize;
});
