import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent, within } from "storybook/test";
import { KelsierStoryRouter } from "../../../.storybook/KelsierStoryRouter";
import { KelsierPage } from "./KelsierPage";

const meta = {
	title: "Kelsier/Page",
	component: KelsierPage,
	parameters: {
		layout: "fullscreen",
	},
	decorators: [
		(Story) => (
			<KelsierStoryRouter>
				<Story />
			</KelsierStoryRouter>
		),
	],
} satisfies Meta<typeof KelsierPage>;

export default meta;

type Story = StoryObj<typeof meta>;

export const CurrentLandingPage: Story = {};

export const AssessmentInProgress: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			canvas.getByRole("button", { name: "Discover your team" }),
		);
		await userEvent.click(
			canvas.getByRole("radio", { name: "Restructure immediately" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Next question" }),
		);
	},
};

export const AssessmentComplete: Story = {
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);

		await userEvent.click(
			canvas.getByRole("button", { name: "Discover your team" }),
		);
		await userEvent.click(
			canvas.getByRole("radio", { name: "Restructure immediately" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Next question" }),
		);
		await userEvent.click(
			canvas.getByRole("radio", { name: "Find common ground first" }),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Next question" }),
		);
		await userEvent.click(
			canvas.getByRole("radio", {
				name: "Pair them with the strongest collaborator",
			}),
		);
		await userEvent.click(
			canvas.getByRole("button", { name: "Complete prototype" }),
		);
	},
};
