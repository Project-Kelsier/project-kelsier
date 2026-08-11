export const GUEST_COOKIE_NAME = "kelsier_guest";
export const GUEST_SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;

const textEncoder = new TextEncoder();

function encodeBase64Url(bytes: Uint8Array) {
	let binary = "";

	for (const byte of bytes) {
		binary += String.fromCharCode(byte);
	}

	return btoa(binary)
		.replaceAll("+", "-")
		.replaceAll("/", "_")
		.replaceAll("=", "");
}

export function generateGuestToken() {
	const bytes = new Uint8Array(32);
	crypto.getRandomValues(bytes);

	return encodeBase64Url(bytes);
}

export async function hashGuestCredential(value: string) {
	const digest = await crypto.subtle.digest(
		"SHA-256",
		textEncoder.encode(value),
	);

	return encodeBase64Url(new Uint8Array(digest));
}

export function getGuestSessionExpiry(now: Date) {
	return new Date(now.getTime() + GUEST_SESSION_TTL_SECONDS * 1000);
}

export function isLocalRequest(url: URL) {
	return url.hostname === "localhost" || url.hostname === "127.0.0.1";
}
