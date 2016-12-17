const template = require('babel-template');

const buildAmdDefine = template(`
	(function () {
		if (typeof define !== 'function') { /* istanbul ignore next */ var define = require('amdefine')(module); }
		CODE;
	})();
`);

module.exports = function ({ types: t }) {
	return {
		visitor: {
			Program: {
				exit: function (path) {
					if (this.ran) return;
					this.ran = true;

					const node = path.node;
					node.body = [buildAmdDefine({
						CODE: node.body
					})];
				}
			}
		}
	};
};
