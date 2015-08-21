define({
	loaderOptions: {
		packages: [
			{ name: 'remap-istanbul', location: '.' },
			{ name: 'source-map', location: 'node_modules/source-map' }
		]
	},

	suites: [ 'remap-istanbul/tests/unit/all' ],

	excludeInstrumentation: /^(?:tests|node_modules)\//
});
