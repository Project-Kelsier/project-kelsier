import { createFileRoute } from "@tanstack/react-router";
import { KelsierPage } from "../components/kelsier/KelsierPage";

export const Route = createFileRoute("/")({
	head: () => ({
		meta: [
			{
				title: "Kelsier | Behavioural team intelligence",
			},
			{
				name: "description",
				content:
					"Kelsier reveals the hidden behavioural dynamics shaping every team decision, conflict, and breakthrough.",
			},
		],
	}),
	component: KelsierPage,
});
