.PHONY: list
.ONESHELL:

PKG_NAME=deploy_$(shell date +"%F").zip


list:
	@LC_ALL=C $(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/(^|\n)# Files(\n|$$)/,/(^|\n)# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$'

watch:
	@${MAKE} -j4 _WATCH_NODE _SERVE_PHP

_WATCH_NODE:
	@echo "Start watching for style updates"
	npm run watch

_SERVE_PHP:
	@echo "Start server"
	symfony local:server:start

package:
	@echo "Build"
	npm run build
	@echo "Create deployment zip"
	git archive HEAD --format zip> $(PKG_NAME)
	zip $(PKG_NAME) -r public
	
	