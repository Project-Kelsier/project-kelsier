import { env } from "cloudflare:workers";
import { createServerFn } from "@tanstack/react-start";
import {
	getCookie,
	getRequest,
	setCookie,
	setResponseHeader,
	setResponseStatus,
} from "@tanstack/react-start/server";
import { getDb } from "#/db/client.worker";
import { ACTIVE_ASSESSMENT_SLUG } from "#/lib/assessmentQuestionnaire";
import {
	completeGuestAssessmentAttempt,
	createGuestAssessmentAttempt,
	deleteGuestAssessmentAttempt,
	getActiveAssessmentQuestionnaireBySlug,
	getActiveGuestSessionByTokenHash,
	getGuestAssessmentProgress,
	getGuestIncompleteAssessmentEntry,
	getLatestGuestAssessmentResult,
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

import { enforceGuestRateLimit } from "./guestRateLimit";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CONTINUATION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

function privateResponse() {
	setResponseHeader("Cache-Control", "private, no-store");
}

function readGuestToken() {
	const token = getCookie(GUEST_COOKIE_NAME);
	return token && CONTINUATION_TOKEN_PATTERN.test(token) ? token : null;
}

function invalidInput(message: string): never {
	setResponseStatus(400);
	throw new Error(message);
}

function validateAttemptInput(input: unknown) {
	privateResponse();
	if (
		typeof input !== "object" ||
		input === null ||
		!("attemptId" in input) ||
		typeof input.attemptId !== "string" ||
		!UUID_PATTERN.test(input.attemptId)
	) {
		invalidInput("A valid assessment attempt ID is required.");
	}

	return { attemptId: input.attemptId };
}

function validateAssessmentVersionInput(input: unknown) {
	privateResponse();
	if (
		typeof input !== "object" ||
		input === null ||
		!("assessmentVersionId" in input) ||
		typeof input.assessmentVersionId !== "string" ||
		!UUID_PATTERN.test(input.assessmentVersionId)
	) {
		invalidInput("A valid assessment version ID is required.");
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
		invalidInput("A valid assessment continuation token is required.");
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
		!UUID_PATTERN.test(input.questionId) ||
		!("optionId" in input) ||
		(input.optionId !== null &&
			(typeof input.optionId !== "string" ||
				!UUID_PATTERN.test(input.optionId)))
	) {
		invalidInput("A valid assessment answer is required.");
	}

	return {
		...continuation,
		questionId: input.questionId,
		optionId: input.optionId,
	};
}

export const startGuestAssessment = createServerFn({ method: "POST" }).handler(
	async () => {
		privateResponse();
		await enforceGuestRateLimit("creation");

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
		const existingToken = readGuestToken();
		const existingTokenHash = existingToken
			? await hashGuestCredential(existingToken)
			: null;
		const existingSession = existingTokenHash
			? await getActiveGuestSessionByTokenHash(db, existingTokenHash, now)
			: null;
		const guestToken = generateGuestToken();
		const continuationToken = generateGuestToken();
		const expiresAt = existingSession?.expiresAt ?? getGuestSessionExpiry(now);

		if (existingSession && existingTokenHash) {
			const existingAttempt = await getGuestIncompleteAssessmentEntry(db, {
				tokenHash: existingTokenHash,
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
			...(existingSession
				? { guestSessionId: existingSession.id }
				: { tokenHash: await hashGuestCredential(guestToken) }),
			expiresAt,
		});

		if (!attempt) {
			setResponseStatus(409);
			throw new Error(
				"An unfinished assessment already belongs to this browser session.",
			);
		}

		if (!existingSession) {
			setCookie(GUEST_COOKIE_NAME, guestToken, {
				httpOnly: true,
				secure: !isLocalRequest(new URL(getRequest().url)),
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
		await enforceGuestRateLimit("activity");
		const guestToken = readGuestToken();

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
					resumeAvailable: entry.resumedAt === null,
				}
			: null;
	});

export const getGuestAssessmentResult = createServerFn({ method: "GET" })
	.validator(validateAssessmentVersionInput)
	.handler(async ({ data }) => {
		await enforceGuestRateLimit("activity");
		const guestToken = readGuestToken();

		if (!guestToken) {
			return null;
		}

		return getLatestGuestAssessmentResult(getDb(env), {
			tokenHash: await hashGuestCredential(guestToken),
			assessmentVersionId: data.assessmentVersionId,
			now: new Date(),
		});
	});

export const resumeGuestAssessment = createServerFn({ method: "POST" })
	.validator(validateContinuationInput)
	.handler(async ({ data }) => {
		await enforceGuestRateLimit("activity");
		const guestToken = readGuestToken();

		if (!guestToken) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const db = getDb(env);
		const now = new Date();
		const tokenHash = await hashGuestCredential(guestToken);
		const continuationTokenHash = await hashGuestCredential(
			data.continuationToken,
		);
		const outcome = await resumeGuestAssessmentAttempt(db, {
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

		const progress = await getGuestAssessmentProgress(db, {
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
		await enforceGuestRateLimit("creation");
		const guestToken = readGuestToken();

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
		await enforceGuestRateLimit("activity");
		const guestToken = readGuestToken();

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

		if (result.status === "completion-required") {
			setResponseStatus(409);
			throw new Error("The final answer must complete the assessment.");
		}

		if (result.status === "not-found") {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		return { currentQuestionIndex: result.currentQuestionIndex };
	});

export const completeGuestAssessment = createServerFn({ method: "POST" })
	.validator(validateAnswerInput)
	.handler(async ({ data }) => {
		await enforceGuestRateLimit("activity");
		const guestToken = readGuestToken();

		if (!guestToken) {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		const outcome = await completeGuestAssessmentAttempt(getDb(env), {
			attemptId: data.attemptId,
			tokenHash: await hashGuestCredential(guestToken),
			continuationTokenHash: await hashGuestCredential(data.continuationToken),
			questionId: data.questionId,
			optionId: data.optionId,
			now: new Date(),
		});

		if (outcome.status === "invalid-answer") {
			setResponseStatus(400);
			throw new Error("The selected final answer is not valid.");
		}

		if (outcome.status === "missing-required") {
			setResponseStatus(409);
			throw new Error("Answer every required question before completing.");
		}

		if (outcome.status === "not-found") {
			setResponseStatus(404);
			throw new Error("The assessment attempt is unavailable.");
		}

		return outcome.result;
	});

export const deleteGuestAttempt = createServerFn({ method: "POST" })
	.validator(validateAttemptInput)
	.handler(async ({ data }) => {
		await enforceGuestRateLimit("deletion");
		const guestToken = readGuestToken();

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
