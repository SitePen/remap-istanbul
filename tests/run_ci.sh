#!/usr/bin/env bash
set -e
cd "$(dirname $0)/.."
rm -rf tmp
npx intern config=tests/intern.json reporters=lcov && cat ./lcov.info | ./node_modules/.bin/codecov
