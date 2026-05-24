const KELSIER_HOMEPAGE_PATH = "/";
const LEGAL_PATHS = new Set(["/privacy", "/terms"]);

export function isKelsierHomepage(pathname: string) {
	return pathname === KELSIER_HOMEPAGE_PATH;
}

export function isKelsierSurface(pathname: string) {
	return isKelsierHomepage(pathname) || !LEGAL_PATHS.has(pathname);
}

export function getBodyClassName(pathname: string) {
	const baseClasses =
		"font-sans antialiased [overflow-wrap:anywhere] selection:bg-[rgba(79,184,178,0.24)]";

	return isKelsierSurface(pathname)
		? `${baseClasses} kelsier-body`
		: baseClasses;
}
