const KELSIER_HOMEPAGE_PATH = "/";

export function isKelsierHomepage(pathname: string) {
	return pathname === KELSIER_HOMEPAGE_PATH;
}

export function shouldRenderGlobalHeader(pathname: string) {
	return !isKelsierHomepage(pathname);
}

export function getBodyClassName(pathname: string) {
	const baseClasses =
		"font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]";

	return isKelsierHomepage(pathname)
		? `${baseClasses} kelsier-body`
		: baseClasses;
}
