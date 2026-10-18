import { createMiddleware } from "@tanstack/react-start";
import {
	setResponseHeader,
	setResponseStatus,
} from "@tanstack/react-start/server";

// Only explicitly authored public messages may cross the server-function boundary.
export class AssessmentRequestError extends Error {}

export const assessmentErrorMiddleware = createMiddleware({
	type: "function",
}).server(async ({ next }) => {
	try {
		return await next();
	} catch (error) {
		if (error instanceof AssessmentRequestError) throw error;
		setResponseStatus(500);
		setResponseHeader("Cache-Control", "private, no-store");
		console.error("Assessment request failed.");
		throw new Error("The assessment request is temporarily unavailable.");
	}
});
