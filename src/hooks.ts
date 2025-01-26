import type { Reroute } from "@sveltejs/kit";

export const reroute: Reroute = ({ url }) => {
	if (url.hostname === "docscanner.eu" || url.hostname === "www.docscanner.eu") {
		return `/site${url.pathname}`;
	} else if (url.hostname === "web.docscanner.eu") {
		return `/web${url.pathname}`;
	} else {
		// best effort routing for local.. Can break..
		if (url.pathname == '/') {
			return `${url.pathname}`;
		}
		else if (url.pathname.startsWith("/web")) {
			return `${url.pathname}`;
		}
		else if (url.pathname.startsWith("/site")) {
			return `${url.pathname}`;
		}
		else if (url.pathname.startsWith("/scanner")) {
			return `/web${url.pathname}`;
		}
		else {
			return `/site${url.pathname}`;
		}

	}
};