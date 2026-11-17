import { useCallback, useEffect, useReducer, useRef } from "react";

export type AssessmentIntent =
	| { kind: "starting" }
	| { kind: "resuming" | "replacing" | "deleting"; attemptId: string }
	| { kind: "saving" | "completing"; attemptId: string; questionId: string };
export type OperationTicket = Readonly<{
	epoch: object;
	requestId: number;
	questionnaireId: string;
	intent: AssessmentIntent;
}>;
export type AssessmentOperation =
	| { status: "idle" }
	| { status: "pending" | "uncertain"; ticket: OperationTicket };
type Event =
	| { type: "begin"; ticket: OperationTicket }
	| { type: "settle"; ticket: OperationTicket; uncertain: boolean }
	| { type: "reset" };
const idle: AssessmentOperation = { status: "idle" };
function sameIntent(a: AssessmentIntent, b: AssessmentIntent) {
	return (
		a.kind === b.kind &&
		("attemptId" in a ? a.attemptId : undefined) ===
			("attemptId" in b ? b.attemptId : undefined) &&
		("questionId" in a ? a.questionId : undefined) ===
			("questionId" in b ? b.questionId : undefined)
	);
}
export function canBegin(state: AssessmentOperation, intent: AssessmentIntent) {
	if (state.status === "idle") return true;
	return (
		state.status === "uncertain" &&
		!["starting", "deleting"].includes(intent.kind) &&
		sameIntent(state.ticket.intent, intent)
	);
}
export function assessmentOperationReducer(
	state: AssessmentOperation,
	event: Event,
): AssessmentOperation {
	if (event.type === "reset") return idle;
	if (event.type === "begin")
		return canBegin(state, event.ticket.intent)
			? { status: "pending", ticket: event.ticket }
			: state;
	if (state.status !== "pending" || state.ticket !== event.ticket) return state;
	return event.uncertain ? { status: "uncertain", ticket: event.ticket } : idle;
}

// The ref admits work synchronously. React state publishes that same transition;
// neither disabled buttons nor reducer dispatch alone prevent same-tick RPCs.
export function useAssessmentOperation(questionnaireId: string) {
	const [operation, dispatch] = useReducer(assessmentOperationReducer, idle);
	const live = useRef<{
		epoch: object;
		sequence: number;
		state: AssessmentOperation;
	} | null>(null);
	useEffect(() => {
		live.current = { epoch: {}, sequence: 0, state: idle };
		dispatch({ type: "reset" });
		return () => {
			live.current = null;
		};
	}, []);
	const begin = useCallback(
		(intent: AssessmentIntent) => {
			const scope = live.current;
			if (!scope || !canBegin(scope.state, intent)) return null;
			const ticket: OperationTicket = {
				epoch: scope.epoch,
				requestId: ++scope.sequence,
				questionnaireId,
				intent,
			};
			scope.state = assessmentOperationReducer(scope.state, {
				type: "begin",
				ticket,
			});
			dispatch({ type: "begin", ticket });
			return ticket;
		},
		[questionnaireId],
	);
	const isCurrent = useCallback((ticket: OperationTicket) => {
		const scope = live.current;
		return Boolean(
			scope &&
				scope.epoch === ticket.epoch &&
				scope.state.status === "pending" &&
				scope.state.ticket === ticket,
		);
	}, []);
	const settle = useCallback((ticket: OperationTicket, uncertain = false) => {
		const scope = live.current;
		if (!scope || scope.epoch !== ticket.epoch) return;
		scope.state = assessmentOperationReducer(scope.state, {
			type: "settle",
			ticket,
			uncertain,
		});
		dispatch({ type: "settle", ticket, uncertain });
	}, []);
	return { operation, begin, isCurrent, settle };
}
