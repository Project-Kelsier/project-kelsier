import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequestIP,
	getRequestUrl,
	setCookie,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { getDb } from "#/db/client.worker";
import { ACTIVE_ASSESSMENT_SLUG } from "#/lib/assessmentQuestionnaire";
import {
	createGuestAssessmentAttempt,
	deleteGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
	getActiveGuestSessionByTokenHash,
} from "#/services/assessments";
import {
	GUEST_COOKIE_NAME,
	GUEST_SESSION_TTL_SECONDS,
	generateGuestToken,
	getGuestSessionExpiry,
	hashGuestCredential,
	isLocalRequest,
} from "./guestCredential";

const ATTEMPT_ID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function validateAttemptInput(input: unknown) {
	if (
		typeof input !== "object" ||
		input === null ||
		!("attemptId" in input) ||
		typeof input.attemptId !== "string" ||
		!ATTEMPT_ID_PATTERN.test(input.attemptId)
	) {
		throw new Error("A valid assessment attempt ID is required.");
	}

	return { attemptId: input.attemptId };
}

async function enforceAttemptCreationRateLimit() {
	const requestKey = await hashGuestCredential(
		getRequestIP() ?? "unavailable-request-ip",
	);
	const outcome = await env.ASSESSMENT_ATTEMPT_RATE_LIMITER.limit({
		key: requestKey,
	});

	if (!outcome.success) {
		setResponseStatus(429);
		throw new Error("Too many assessment starts. Please try again shortly.");
	}
}

export const startGuestAssessment = createServerFn({ method: "POST" }).handler(
	async () => {
		await enforceAttemptCreationRateLimit();

		const db = getDb(env);
		const questionnaire = await getActiveAssessmentQuestionnaireBySlug(
			db,
			ACTIVE_ASSESSMENT_SLUG,
		);

		if (!questionnaire) {
			setResponseStatus(503);
			throw new Error("The active assessment questionnaire is unavailable.");
		}

		const now = new Date();
		const existingToken = getCookie(GUEST_COOKIE_NAME);
		const existingTokenHash = existingToken
			? await hashGuestCredential(existingToken)
			: null;
		const existingSession = existingTokenHash
			? await getActiveGuestSessionByTokenHash(db, existingTokenHash, now)
			: null;
		const guestToken = existingSession ? null : generateGuestToken();
		const expiresAt = existingSession?.expiresAt ?? getGuestSessionExpiry(now);
		const attempt = await createGuestAssessmentAttempt(db, {
			assessmentVersionId: questionnaire.id,
			guestSessionId: existingSession?.id,
			tokenHash: guestToken ? await hashGuestCredential(guestToken) : undefined,
			expiresAt,
		});

		if (guestToken) {
			setCookie(GUEST_COOKIE_NAME, guestToken, {
				httpOnly: true,
				secure: !isLocalRequest(getRequestUrl()),
				sameSite: "lax",
				path: "/",
				maxAge: GUEST_SESSION_TTL_SECONDS,
			});
		}

		return {
			attemptId: attempt.id,
			expiresAt: attempt.expiresAt.toISOString(),
		};
	},
);

export const deleteGuestAttempt = createServerFn({ method: "POST" })
	.validator(validateAttemptInput)
	.handler(async ({ data }) => {
		const guestToken = getCookie(GUEST_COOKIE_NAME);

		if (!guestToken) {
			setResponseStatus(404);
			return { deleted: false };
		}

		const deleted = await deleteGuestAssessmentAttempt(getDb(env), {
			attemptId: data.attemptId,
			tokenHash: await hashGuestCredential(guestToken),
			now: new Date(),
		});

		if (!deleted) {
			setResponseStatus(404);
		}

		return { deleted };
	});
