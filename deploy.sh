#!/bin/sh

rsync -a --delete build/ docscanner.eu:./node_apps/docscanner.eu/build/
scp package.json docscanner.eu:./node_apps/docscanner.eu/package.json
