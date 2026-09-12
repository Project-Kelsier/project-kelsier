// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as service from "#/services/assessments";
import { getActiveAssessmentQuestionnaire } from "./assessmentQuestionnaire.functions";
import {
	completeGuestAssessment,
	deleteGuestAttempt,
	getGuestAssessmentEntry,
	getGuestAssessmentResult,
	resumeGuestAssessment,
	saveGuestAnswer,
	startFreshGuestAssessment,
	startGuestAssessment,
} from "./guestAssessment.functions";
import {
	GUEST_SESSION_TTL_SECONDS,
	hashGuestCredential,
} from "./guestCredential";

const mocks = vi.hoisted(() => ({
	request: new Request("https://assessment.example/", {
		headers: { "CF-Connecting-IP": "192.0.2.1" },
	}),
	cookie: vi.fn(),
	status: vi.fn(),
	header: vi.fn(),
	setCookie: vi.fn(),
	db: vi.fn(() => ({})),
	creation: vi.fn(),
	activity: vi.fn(),
}));
vi.mock("cloudflare:workers", () => ({
	env: {
		ASSESSMENT_ATTEMPT_RATE_LIMITER: { limit: mocks.creation },
		ASSESSMENT_ACTIVITY_RATE_LIMITER: { limit: mocks.activity },
	},
}));
vi.mock("#/db/client.worker", () => ({ getDb: mocks.db }));
vi.mock("@tanstack/react-start/server", () => ({
	getRequest: () => mocks.request,
	getCookie: mocks.cookie,
	setCookie: mocks.setCookie,
	setResponseStatus: mocks.status,
	setResponseHeader: mocks.header,
}));
// Exercise our validators and handlers; real transport/CSRF runs in Playwright.
vi.mock("@tanstack/react-start", () => ({
	createServerFn: () => {
		let validate = (value: unknown) => value;
		const builder = {
			validator: (validator: typeof validate) => {
				validate = validator;
				return builder;
			},
			handler:
				(handler: (input: { data: unknown }) => unknown) =>
				async (input: { data?: unknown } = {}) =>
					handler({ data: validate(input.data) }),
		};
		return builder;
	},
}));
vi.mock("#/services/assessments", () => ({
	completeGuestAssessmentAttempt: vi.fn(),
	createGuestAssessmentAttempt: vi.fn(),
	deleteGuestAssessmentAttempt: vi.fn(),
	getActiveAssessmentQuestionnaireBySlug: vi.fn(),
	getActiveGuestSessionByTokenHash: vi.fn(),
	getGuestAssessmentProgress: vi.fn(),
	getGuestIncompleteAssessmentEntry: vi.fn(),
	getLatestGuestAssessmentResult: vi.fn(),
	replaceGuestAssessmentAttempt: vi.fn(),
	resumeGuestAssessmentAttempt: vi.fn(),
	saveGuestAssessmentAnswer: vi.fn(),
}));

const id = "10000000-0000-4000-8000-000000000001";
const cookie = "a".repeat(43);
const data = {
	attemptId: id,
	continuationToken: "b".repeat(43),
	questionId: id,
	optionId: id,
};
const versionInput = { data: { assessmentVersionId: id } };

beforeEach(() => {
	vi.resetAllMocks();
	mocks.request = new Request("https://assessment.example/", {
		headers: { "CF-Connecting-IP": "192.0.2.1" },
	});
	mocks.cookie.mockReturnValue(cookie);
	mocks.creation.mockResolvedValue({ success: true });
	mocks.activity.mockResolvedValue({ success: true });
	vi.mocked(service.getActiveAssessmentQuestionnaireBySlug).mockResolvedValue({
		id,
		slug: "test",
		title: "Test",
		description: null,
		questions: [],
	});
	vi.mocked(service.getActiveGuestSessionByTokenHash).mockResolvedValue(null);
	vi.mocked(service.createGuestAssessmentAttempt).mockResolvedValue({
		id,
		startedAt: new Date(),
		expiresAt: new Date("2099-01-01"),
	});
});

describe("guest HTTP boundary", () => {
	it("sets private responses and a secure host-only cookie for a new session", async () => {
		mocks.cookie.mockReturnValue(undefined);
		const result = await startGuestAssessment();
		expect(mocks.header).toHaveBeenCalledWith(
			"Cache-Control",
			"private, no-store",
		);
		expect(mocks.setCookie).toHaveBeenCalledWith(
			"kelsier_guest",
			expect.stringMatching(/^[A-Za-z0-9_-]{43}$/),
			{
				httpOnly: true,
				secure: true,
				sameSite: "lax",
				path: "/",
				maxAge: GUEST_SESSION_TTL_SECONDS,
			},
		);
		const rawToken = mocks.setCookie.mock.calls[0][1];
		expect(service.createGuestAssessmentAttempt).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tokenHash: await hashGuestCredential(rawToken),
			}),
		);
		expect(result).not.toHaveProperty("tokenHash");
		expect(result).not.toHaveProperty("guestToken");
	});

	it("ignores forwarded host headers when deciding whether cookies are secure", async () => {
		mocks.request = new Request("https://assessment.example/", {
			headers: {
				"CF-Connecting-IP": "192.0.2.1",
				"X-Forwarded-Host": "localhost",
				"X-Forwarded-Proto": "http",
			},
		});
		await startGuestAssessment();
		expect(mocks.setCookie.mock.calls[0][2].secure).toBe(true);
	});

	it("allows local development without an edge IP and with an insecure local cookie", async () => {
		mocks.request = new Request("http://localhost:3000/");
		await startGuestAssessment();
		expect(mocks.setCookie.mock.calls[0][2].secure).toBe(false);
	});

	it("does not refresh the cookie or extend an existing session", async () => {
		const expiresAt = new Date("2099-01-01");
		vi.mocked(service.getActiveGuestSessionByTokenHash).mockResolvedValue({
			id,
			expiresAt,
		});
		vi.mocked(service.getGuestIncompleteAssessmentEntry).mockResolvedValue(
			null,
		);
		await startGuestAssessment();
		expect(mocks.setCookie).not.toHaveBeenCalled();
		expect(service.createGuestAssessmentAttempt).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({ guestSessionId: id, expiresAt }),
		);
	});

	it("maps a concurrent creation conflict to 409 without setting a cookie", async () => {
		vi.mocked(service.createGuestAssessmentAttempt).mockResolvedValue(null);
		await expect(startGuestAssessment()).rejects.toThrow("unfinished");
		expect(mocks.status).toHaveBeenCalledWith(409);
		expect(mocks.setCookie).not.toHaveBeenCalled();
	});

	it.each([undefined, "bad", "a".repeat(44)])(
		"rejects absent or malformed cookies before database access: %s",
		async (token) => {
			mocks.cookie.mockReturnValue(token);
			await expect(saveGuestAnswer({ data })).rejects.toThrow("unavailable");
			expect(await getGuestAssessmentEntry(versionInput)).toBeNull();
			expect(await getGuestAssessmentResult(versionInput)).toBeNull();
			expect(await deleteGuestAttempt({ data: { attemptId: id } })).toEqual({
				deleted: false,
			});
			expect(mocks.db).not.toHaveBeenCalled();
			expect(mocks.status).toHaveBeenCalledWith(404);
		},
	);

	it.each([
		{ ...data, attemptId: "bad" },
		{ ...data, questionId: "bad" },
		{ ...data, optionId: "bad" },
		{ ...data, continuationToken: "bad" },
	])(
		"rejects malformed input with 400 before database access",
		async (invalid) => {
			await expect(saveGuestAnswer({ data: invalid })).rejects.toThrow("valid");
			expect(mocks.status).toHaveBeenCalledWith(400);
			expect(mocks.db).not.toHaveBeenCalled();
		},
	);

	it.each([
		"invalid-answer",
		"response-complete",
		"completion-required",
		"not-found",
	] as const)("maps save outcome %s to its HTTP status", async (status) => {
		vi.mocked(service.saveGuestAssessmentAnswer).mockResolvedValue({ status });
		await expect(saveGuestAnswer({ data })).rejects.toThrow();
		expect(mocks.status).toHaveBeenCalledWith(
			status === "invalid-answer" ? 400 : status === "not-found" ? 404 : 409,
		);
	});

	it.each(["invalid-answer", "missing-required", "not-found"] as const)(
		"maps completion outcome %s",
		async (status) => {
			vi.mocked(service.completeGuestAssessmentAttempt).mockResolvedValue({
				status,
			});
			await expect(completeGuestAssessment({ data })).rejects.toThrow();
			expect(mocks.status).toHaveBeenCalledWith(
				status === "invalid-answer" ? 400 : status === "not-found" ? 404 : 409,
			);
		},
	);

	it("accepts an omitted optional answer and derives ownership only from the cookie", async () => {
		vi.mocked(service.saveGuestAssessmentAnswer).mockResolvedValue({
			status: "saved",
			currentQuestionIndex: 1,
		});
		await saveGuestAnswer({ data: { ...data, optionId: null } });
		expect(service.saveGuestAssessmentAnswer).toHaveBeenCalledWith(
			expect.anything(),
			expect.objectContaining({
				tokenHash: await hashGuestCredential(cookie),
				continuationTokenHash: await hashGuestCredential(
					data.continuationToken,
				),
				optionId: null,
			}),
		);
	});

	it("reuses one database client for resume and progress", async () => {
		vi.mocked(service.resumeGuestAssessmentAttempt).mockResolvedValue(
			"resumed",
		);
		vi.mocked(service.getGuestAssessmentProgress).mockResolvedValue({
			id,
			currentQuestionIndex: 1,
			expiresAt: new Date("2099-01-01"),
			answers: [],
		});
		await resumeGuestAssessment({ data });
		expect(mocks.db).toHaveBeenCalledOnce();
	});
});

describe("abuse controls", () => {
	it("uses the Cloudflare IP instead of spoofable forwarding headers", async () => {
		mocks.request = new Request("https://assessment.example/", {
			headers: {
				"CF-Connecting-IP": "192.0.2.1",
				"X-Forwarded-For": "192.0.2.99",
			},
		});
		await startGuestAssessment();
		expect(mocks.creation).toHaveBeenCalledWith({
			key: `creation:${await hashGuestCredential("192.0.2.1")}`,
		});
	});

	it("fails closed when the hosted edge IP is missing", async () => {
		mocks.request = new Request("https://assessment.example/", {
			headers: {
				"X-Forwarded-For": "192.0.2.99",
				"X-Forwarded-Host": "localhost",
			},
		});
		await expect(startGuestAssessment()).rejects.toThrow(
			"temporarily unavailable",
		);
		expect(mocks.status).toHaveBeenCalledWith(503);
		expect(mocks.db).not.toHaveBeenCalled();
	});

	it.each([
		() => getActiveAssessmentQuestionnaire(),
		() => startGuestAssessment(),
		() => startFreshGuestAssessment({ data }),
		() => resumeGuestAssessment({ data }),
		() => saveGuestAnswer({ data }),
		() => completeGuestAssessment({ data }),
		() => deleteGuestAttempt({ data }),
		() => getGuestAssessmentEntry(versionInput),
		() => getGuestAssessmentResult(versionInput),
	])("blocks throttled requests before database access", async (run) => {
		mocks.creation.mockResolvedValue({ success: false });
		mocks.activity.mockResolvedValue({ success: false });
		await expect(run()).rejects.toThrow("Too many");
		expect(mocks.status).toHaveBeenCalledWith(429);
		expect(mocks.header).toHaveBeenCalledWith("Retry-After", "60");
		expect(mocks.db).not.toHaveBeenCalled();
	});

	it("fails closed when the rate limiter is unavailable", async () => {
		mocks.activity.mockRejectedValue(new Error("binding unavailable"));
		await expect(saveGuestAnswer({ data })).rejects.toThrow(
			"temporarily unavailable",
		);
		expect(mocks.status).toHaveBeenCalledWith(503);
		expect(mocks.db).not.toHaveBeenCalled();
	});

	it("keeps deletion in a separate bucket from ordinary activity", async () => {
		vi.mocked(service.deleteGuestAssessmentAttempt).mockResolvedValue(true);
		await deleteGuestAttempt({ data });
		expect(mocks.activity).toHaveBeenCalledWith({
			key: `deletion:${await hashGuestCredential("192.0.2.1")}`,
		});
	});
});
