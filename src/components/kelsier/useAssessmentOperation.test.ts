import type { OperationTicket } from "./useAssessmentOperation";

function required(ticket: OperationTicket | null | undefined): OperationTicket {
	if (!ticket) throw new Error("Expected admitted operation");
	return ticket;
}

import { act, renderHook } from "@testing-library/react";
import { createElement, StrictMode } from "react";
import { expect, it } from "vitest";
import {
	assessmentOperationReducer,
	useAssessmentOperation,
} from "./useAssessmentOperation";

it("admits only one request synchronously and ignores stale finalization", () => {
	const hook = renderHook(() => useAssessmentOperation("q"));
	let a: ReturnType<typeof hook.result.current.begin> = null;
	act(() => {
		a = hook.result.current.begin({
			kind: "saving",
			attemptId: "a",
			questionId: "1",
		});
		expect(
			hook.result.current.begin({ kind: "deleting", attemptId: "a" }),
		).toBeNull();
	});
	expect(required(a)).not.toBeNull();
	act(() => hook.result.current.settle(required(a)));
	let b: ReturnType<typeof hook.result.current.begin> = null;
	act(() => {
		b = hook.result.current.begin({
			kind: "completing",
			attemptId: "a",
			questionId: "2",
		});
	});
	act(() => hook.result.current.settle(required(a), true));
	expect(hook.result.current.operation.status).toBe("pending");
	expect(hook.result.current.isCurrent(required(a))).toBe(false);
	expect(hook.result.current.isCurrent(required(b))).toBe(true);
	hook.unmount();
	expect(hook.result.current.isCurrent(required(b))).toBe(false);
});
it("retains uncertainty until a safe same-intent retry and never clears it in finally", () => {
	const hook = renderHook(() => useAssessmentOperation("q"));
	let a: ReturnType<typeof hook.result.current.begin> = null;
	act(() => {
		a = hook.result.current.begin({ kind: "resuming", attemptId: "a" });
	});
	act(() => {
		hook.result.current.settle(required(a), true);
		hook.result.current.settle(required(a));
	});
	expect(hook.result.current.operation.status).toBe("uncertain");
	act(() => {
		expect(
			hook.result.current.begin({ kind: "replacing", attemptId: "a" }),
		).toBeNull();
	});
	act(() => {
		expect(
			hook.result.current.begin({ kind: "resuming", attemptId: "a" }),
		).not.toBeNull();
	});
	hook.unmount();
});
it("invalidates tickets across lifetime cleanup in Strict Mode", () => {
	const hook = renderHook(() => useAssessmentOperation("q"), {
		wrapper: ({ children }) => createElement(StrictMode, null, children),
	});
	let a: ReturnType<typeof hook.result.current.begin> = null;
	act(() => {
		a = hook.result.current.begin({ kind: "starting" });
	});
	expect(hook.result.current.isCurrent(required(a))).toBe(true);
	hook.unmount();
	expect(hook.result.current.isCurrent(required(a))).toBe(false);
	const fresh = renderHook(() => useAssessmentOperation("q"));
	act(() => fresh.result.current.settle(required(a)));
	expect(fresh.result.current.operation.status).toBe("idle");
	fresh.unmount();
});
it("rejects stale success/error settlement and invalid transitions purely", () => {
	const ticket = {
		epoch: {},
		requestId: 1,
		questionnaireId: "q",
		intent: { kind: "starting" as const },
	};
	const pending = assessmentOperationReducer(
		{ status: "idle" },
		{ type: "begin", ticket },
	);
	expect(
		assessmentOperationReducer(pending, {
			type: "begin",
			ticket: { ...ticket, requestId: 2 },
		}),
	).toBe(pending);
	expect(
		assessmentOperationReducer(pending, {
			type: "settle",
			ticket: { ...ticket },
			uncertain: true,
		}),
	).toBe(pending);
});
