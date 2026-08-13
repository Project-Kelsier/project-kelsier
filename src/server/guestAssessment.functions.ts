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
	getGuestAssessmentProgress,
	getGuestIncompleteAssessmentEntry,
	replaceGuestAssessmentAttempt,
	resumeGuestAssessmentAttempt,
	saveGuestAssessmentAnswer,
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
const CONTINUATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

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

function validateAssessmentVersionInput(input: unknown) {
	if (
		typeof input !== "object" ||
		input === null ||
		!("assessmentVersionId" in input) ||
		typeof input.assessmentVersionId !== "string" ||
		!ATTEMPT_ID_PATTERN.test(input.assessmentVersionId)
	) {
		throw new Error("A valid assessment version ID is required.");
	}

	return { assessmentVersionId: input.assessmentVersionId };
}

function validateContinuationInput(input: unknown) {
	const attempt = validateAttemptInput(input);

	if (
		typeof input !== "object" ||
		input === null ||
		!("continuationToken" in input) ||
		typeof input.continuationToken !== "string" ||
		!CONTINUATION_TOKEN_PATTERN.test(input.continuationToken)
	) {
		throw new Error("A valid assessment continuation token is required.");
	}

	return { ...attempt, continuationToken: input.continuationToken };
}

function validateAnswerInput(input: unknown) {
	const continuation = validateContinuationInput(input);

	if (
		typeof input !== "object" ||
		input === null ||
		!("questionId" in input) ||
		typeof input.questionId !== "string" ||
		!ATTEMPT_ID_PATTERN.test(input.questionId) ||
		!("optionId" in input) ||
		(input.optionId !== null &&
			(typeof input.optionId !== "string" ||
				!ATTEMPT_ID_PATTERN.test(input.optionId)))
	) {
		throw new Error("A valid assessment answer is required.");
	}

	return {
		...continuation,
		questionId: input.questionId,
		optionId: input.optionId,
	};
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
		const continuationToken = generateGuestToken();
		const expiresAt = existingSession?.expiresAt ?? getGuestSessionExpiry(now);

		if (existingSession) {
			const existingAttempt = await getGuestIncompleteAssessmentEntry(db, {
				tokenHash: existingTokenHash as string,
				assessmentVersionId: questionnaire.id,
				now,
			});

			if (existingAttempt) {
				setResponseStatus(409);
				throw new Error(
					"An unfinished assessment already belongs to this browser session.",
				);
			}
		}

		const attempt = await createGuestAssessmentAttempt(db, {
			assessmentVersionId: questionnaire.id,
			continuationTokenHash: await hashGuestCredential(continuationToken),
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
			continuationToken,
		};
	},
);

export const getGuestAssessmentEntry = createServerFn({ method: "GET" })
	.validator(validateAssessmentVersionInput)
	.handler(async ({ data }) => {
		const guestToken = getCookie(GUEST_COOKIE_NAME);

		if (!guestToken) {
			return null;
		}

		const entry = await getGuestIncompleteAssessmentEntry(getDb(env), {
			tokenHash: await hashGuestCredential(guestToken),
			assessmentVersionId: data.assessmentVersionId,
			now: new Date(),
		});

		return entry
			? {
					attemptId: entry.id,
					startedAt: entry.startedAt.toISOString(),
					expiresAt: entry.expiresAt.toISOString(),
					answeredCount: entry.answeredCount,
					answersComplete: entry.answersComplete,
					answers: entry.answersComplete
						? Object.fromEntries(
								entry.answers.map((answer) => [
									answer.questionId,
									answer.optionId,
								]),
							)
						: undefined,
					resumeAvailable: entry.resumedAt === null,
				}
			: null;
	});

export const resumeGuestAssessment = createServerFn({ method: "POST" })
	.validator(validateContinuationInput)
	.handler(async ({ data }) => {
		const guestToken = getCookie(GUEST_COOKIE_NAME);

		if (!guestToken) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const now = new Date();
		const tokenHash = await hashGuestCredential(guestToken);
		const continuationTokenHash = await hashGuestCredential(
			data.continuationToken,
		);
		const outcome = await resumeGuestAssessmentAttempt(getDb(env), {
			attemptId: data.attemptId,
			tokenHash,
			continuationTokenHash,
			now,
		});

		if (outcome === "resume-unavailable") {
			setResponseStatus(409);
			throw new Error("This assessment has already used its single resume.");
		}

		if (outcome === "response-complete") {
			setResponseStatus(409);
			throw new Error("This assessment response is already complete.");
		}

		if (outcome === "not-found") {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const progress = await getGuestAssessmentProgress(getDb(env), {
			attemptId: data.attemptId,
			tokenHash,
			continuationTokenHash,
			now,
		});

		if (!progress) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		return {
			attemptId: progress.id,
			expiresAt: progress.expiresAt.toISOString(),
			continuationToken: data.continuationToken,
			currentQuestionIndex: progress.currentQuestionIndex,
			answers: Object.fromEntries(
				progress.answers.map((answer) => [answer.questionId, answer.optionId]),
			),
		};
	});

export const startFreshGuestAssessment = createServerFn({ method: "POST" })
	.validator(validateContinuationInput)
	.handler(async ({ data }) => {
		await enforceAttemptCreationRateLimit();
		const guestToken = getCookie(GUEST_COOKIE_NAME);

		if (!guestToken) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const db = getDb(env);
		const questionnaire = await getActiveAssessmentQuestionnaireBySlug(
			db,
			ACTIVE_ASSESSMENT_SLUG,
		);

		if (!questionnaire) {
			setResponseStatus(503);
			throw new Error("The active assessment questionnaire is unavailable.");
		}

		const attempt = await replaceGuestAssessmentAttempt(db, {
			attemptId: data.attemptId,
			tokenHash: await hashGuestCredential(guestToken),
			assessmentVersionId: questionnaire.id,
			continuationTokenHash: await hashGuestCredential(data.continuationToken),
			now: new Date(),
		});

		if (!attempt) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		return {
			attemptId: attempt.id,
			expiresAt: attempt.expiresAt.toISOString(),
			continuationToken: data.continuationToken,
		};
	});

export const saveGuestAnswer = createServerFn({ method: "POST" })
	.validator(validateAnswerInput)
	.handler(async ({ data }) => {
		const guestToken = getCookie(GUEST_COOKIE_NAME);

		if (!guestToken) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const result = await saveGuestAssessmentAnswer(getDb(env), {
			attemptId: data.attemptId,
			tokenHash: await hashGuestCredential(guestToken),
			continuationTokenHash: await hashGuestCredential(data.continuationToken),
			questionId: data.questionId,
			optionId: data.optionId,
			now: new Date(),
		});

		if (result.status === "invalid-answer") {
			setResponseStatus(400);
			throw new Error("The selected answer is not valid for this assessment.");
		}

		if (result.status === "response-complete") {
			setResponseStatus(409);
			throw new Error("This assessment response is already complete.");
		}

		if (result.status === "not-found") {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		return { currentQuestionIndex: result.currentQuestionIndex };
	});

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
