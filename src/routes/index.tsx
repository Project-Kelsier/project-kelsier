import { createFileRoute } from "@tanstack/react-router";
import { KelsierPage } from "../components/kelsier/KelsierPage";
import kelsierCss from "../styles/kelsier.css?url";

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
		links: [
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500&display=swap",
			},
			{
				rel: "stylesheet",
				href: kelsierCss,
			},
		],
	}),
	component: KelsierPage,
});
