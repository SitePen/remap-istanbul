#!/usr/bin/env bash
set -e
cd "$(dirname $0)/.."
rm -rf tmp
npx intern config=tests/intern.json reporters=lcov && bash <(curl -s https://codecov.io/bash) -f ./coverage/lcov.info
