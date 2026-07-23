import type { Meta, StoryObj } from "@storybook/react-vite";
import { KelsierStoryRouter } from "../../../.storybook/KelsierStoryRouter";
import { KelsierFooter } from "./KelsierFooter";

const meta = {
	title: "Kelsier/Footer",
	component: KelsierFooter,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		sectionHrefPrefix: "",
	},
	decorators: [
		(Story) => (
			<KelsierStoryRouter>
				<Story />
			</KelsierStoryRouter>
		),
	],
} satisfies Meta<typeof KelsierFooter>;

export default meta;

type Story = StoryObj<typeof KelsierFooter>;

export const Default: Story = {};
