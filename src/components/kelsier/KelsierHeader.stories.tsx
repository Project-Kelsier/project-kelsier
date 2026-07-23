import type { Meta, StoryObj } from "@storybook/react-vite";
import { KelsierHeader } from "./KelsierHeader";

const meta = {
	title: "Kelsier/Header",
	component: KelsierHeader,
	parameters: {
		layout: "fullscreen",
	},
	args: {
		navRef: () => undefined,
	},
} satisfies Meta<typeof KelsierHeader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
