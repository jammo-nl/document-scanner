.PHONY: list
list:
	@LC_ALL=C $(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/(^|\n)# Files(\n|$$)/,/(^|\n)# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$'

next-image:
	echo "Building docker image"
	podman build . -f Dockerfile.next -t document-scanner:next
	echo "Exporting image"
	-rm dist/document-scanner_next.tar
	podman save -o dist/document-scanner_next.tar document-scanner:next


prd-image:
	echo "Building docker image"
	podman build . -f Dockerfile.prd -t document-scanner:latest
	echo "Exporting image"
	-rm dist/document-scanner_prd.tar
	podman save -o dist/document-scanner_prd.tar document-scanner:latest
	
