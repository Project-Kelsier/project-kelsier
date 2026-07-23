import type { Preview } from "@storybook/react-vite";
import { type ReactNode, useEffect } from "react";
import "../src/styles.css";
import "../src/styles/kelsier.css";

function KelsierTheme({ children }: { children: ReactNode }) {
	useEffect(() => {
		document.body.classList.add("kelsier-body");

		return () => {
			document.body.classList.remove("kelsier-body");
		};
	}, []);

	return <>{children}</>;
}

const preview: Preview = {
	decorators: [
		(Story) => (
			<KelsierTheme>
				<Story />
			</KelsierTheme>
		),
	],
	parameters: {
		layout: "fullscreen",
		a11y: {
			test: "todo",
		},
		controls: {
			matchers: {
				color: /(background|color)$/i,
				date: /Date$/i,
			},
		},
	},
};

export default preview;
