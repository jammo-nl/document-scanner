.PHONY: list
list:
	@LC_ALL=C $(MAKE) -pRrq -f $(firstword $(MAKEFILE_LIST)) : 2>/dev/null | awk -v RS= -F: '/(^|\n)# Files(\n|$$)/,/(^|\n)# Finished Make data base/ {if ($$1 !~ "^[#.]") {print $$1}}' | sort | grep -E -v -e '^[^[:alnum:]]' -e '^$@$$'

deploy-next:
	echo "Building docker image"
	podman build . -f Dockerfile.next -t document-scanner:next
	echo "Exporting image"
	podman save document-scanner:next | ssh -C web.docscanner.eu podman load
	echo "Restart service"
	ssh web.docscanner.eu "podman-compose -f docscanner_next.yaml down && podman-compose -f docscanner_next.yaml up -d"

deploy-prd:
	echo "Building docker image"
	podman build . -f Dockerfile.prd -t document-scanner:latest
	echo "Exporting image"
	podman save document-scanner:latest | ssh -C web.docscanner.eu podman load
	echo "Restart service"
	ssh web.docscanner.eu "podman-compose -f docscanner_prd.yaml down && podman-compose -f docscanner_prd.yaml up -d"
