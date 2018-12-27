const fs = require('fs');
const gulp = require('gulp');
const remapIstanbul = require('../../../lib/gulpRemapIstanbul');

const registerSuite = intern.getPlugin('interface.object').registerSuite;
const assert = intern.getPlugin('chai').assert;

registerSuite('lib/gulpRemapIstanbul', {
	'remap coverage': function () {
		var dfd = this.async();
		var runTasks;

		function remapTask () {
			return gulp.src('tests/unit/support/coverage.json')
				.pipe(remapIstanbul())
				.pipe(gulp.dest('tmp/gulp'));
		}

		gulp.task('assertions', dfd.callback(function () {
			assert.isTrue(fs.existsSync('tmp/gulp/coverage.json'));
		}));

		runTasks = gulp.series(remapTask, 'assertions');
		runTasks();
	},

	'write reports': function () {
		var dfd = this.async();
		var runTasks;

		function remapTask () {
			return gulp.src('tests/unit/support/coverage.json')
				.pipe(remapIstanbul({
					reports: {
						'lcovonly': 'tmp/gulp/lcov.info',
						'html': 'tmp/gulp/html-report',
						'json': 'tmp/gulp/gulp-coverage.json'
					}
				}));
		}

		gulp.task('assertions', dfd.callback(function () {
			assert.isTrue(fs.existsSync('tmp/gulp/gulp-coverage.json'));
			assert.isTrue(fs.existsSync('tmp/gulp/lcov.info'));
			assert.isTrue(fs.existsSync('tmp/gulp/html-report'));
		}));

		runTasks = gulp.series(remapTask, 'assertions');
		runTasks();
	},

	'html report with inline sources': function () {
		var dfd = this.async();
		var runTasks;

		function remapTask () {
			return gulp.src('tests/unit/support/coverage-inlinesource.json')
				.pipe(remapIstanbul({
					reports: {
						'html': 'tmp/gulp/html-report-inline'
					}
				}));
		}

		gulp.task('assertions', dfd.callback(function () {
			assert.isTrue(fs.existsSync('tmp/gulp/html-report-inline'));
		}));

		runTasks = gulp.series(remapTask, 'assertions');
		runTasks();
	},

	'non-transpiled coverage': {
		'warn': function () {
			var dfd = this.async();
			var runTasks;

			function remapTask () {
				return gulp.src('tests/unit/support/coverage-import.json')
					.pipe(remapIstanbul({
						reports: {
							'html': 'tmp/gulp/html-report-import'
						}
					}));
			}

			gulp.task('assertions', dfd.callback(function () {
				assert.isTrue(fs.existsSync('tmp/gulp/html-report-import'));
			}));

			runTasks = gulp.series(remapTask, 'assertions');
			runTasks();
		},

		'fail': function () {
			var dfd = this.async();
			var runTasks;
			var errorStack = [];

			function trapError(error) {
				if (error.message.startsWith('Could not find source map')) {
					errorStack.push(error);
				}
				this.emit('end');
			}

			function remapTask () {
				/*	gulp.series() aborts if any task throws an error. This causes the 'assertions' task to not run
					if the remapTask has an error, so we wrap the error-emitting stream in a Promise that always
					resolves. */
				return new Promise(function (resolve) {
					var isResolved = false;

					gulp.src('tests/unit/support/coverage-import.json')
						.pipe(remapIstanbul({
							fail: true,
							reports: {
								'html': 'tmp/gulp/html-report-fail'
							}
						}))
						.on('error', trapError)
						.on('finish', function () {
							if (!isResolved) {
								isResolved = true;
								resolve();
							}
						})
						.on('end', function () {
							if (!isResolved) {
								isResolved = true;
								resolve();
							}
						});
				});
			}

			gulp.task('assertions', dfd.callback(function () {
				assert.strictEqual(errorStack.length, 1, 'Source map error should have been logged');
				assert.instanceOf(errorStack[0], Error, 'should be of type error');
			}));

			runTasks = gulp.series(remapTask, 'assertions');
			runTasks();
		}
	}
});
