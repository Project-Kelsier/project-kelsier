import { env } from "cloudflare:workers";
import {
	getRequest,
	setResponseHeader,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { hashGuestCredential, isLocalRequest } from "./guestCredential";

export async function enforceGuestRateLimit(
	kind: "creation" | "activity" | "deletion",
) {
	const request = getRequest();
	// Only Cloudflare's edge-provided address is trusted in hosted requests.
	// Local Vite may have no edge headers; it shares a local-only bucket.
	const ip =
		request.headers.get("CF-Connecting-IP") ||
		(isLocalRequest(new URL(request.url)) ? "local-development" : null);
	if (!ip) {
		setResponseStatus(503);
		throw new Error("Assessment requests are temporarily unavailable.");
	}
	const requestKey = await hashGuestCredential(ip);
	let outcome: { success: boolean };
	try {
		const limiter =
			kind === "creation"
				? env.ASSESSMENT_ATTEMPT_RATE_LIMITER
				: env.ASSESSMENT_ACTIVITY_RATE_LIMITER;
		outcome = await limiter.limit({ key: `${kind}:${requestKey}` });
	} catch {
		setResponseStatus(503);
		throw new Error("Assessment requests are temporarily unavailable.");
	}

	if (!outcome.success) {
		setResponseStatus(429);
		setResponseHeader("Retry-After", "60");
		throw new Error("Too many assessment requests. Please try again shortly.");
	}
}
